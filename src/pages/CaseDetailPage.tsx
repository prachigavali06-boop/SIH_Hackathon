import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    MapPin,
    Calendar,
    FlaskConical,
    WifiOff,
    Stethoscope,
    Syringe,
    Pill,
    Camera,
    ShieldAlert
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '../components/ui/Badge';
import { AIExplanationPanel } from '../components/ui/AIExplanationPanel';
import { CaseTimeline } from '../components/ui/CaseTimeline';
import { SYNTHETIC_CASES, SYMPTOM_CATALOG, SYNTHETIC_CLUSTERS } from '../data/seed';
import { getCaseById } from '../services/api';
import { getOfflineIncidents } from '../services/offlineQueue';
import type { CaseRecord } from '../types';
import { useLanguage } from '../i18n/useLanguage';

const SPECIES_EMOJI: Record<string, string> = {
  cattle: '🐄', buffalo: '🐃', goat: '🐐',
  sheep: '🐑', pig: '🐷', poultry: '🐔', equine: '🐴', other: '🐾',
};

const CHAIN_STEP_LABELS: Record<string, string> = {
  Collected:  '🧪 Collected in Cold Chain',
  Dispatched: '🚐 Dispatched to Lab',
  Received:   '🏥 Received at Diagnostic Lab',
};

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    async function fetchCase() {
      try {
        // 1. First lookup: Online / in-memory store
        const onlineRes = await getCaseById(id!);
        if (onlineRes && isMounted) {
          setCaseRecord(onlineRes);
          setLoading(false);
          return;
        }

        // 2. Second lookup: IndexedDB offline queue
        const offlineIncidents = await getOfflineIncidents();
        const matchedOffline = offlineIncidents.find(
          o => o.canonicalCaseId === id || o.localId === id
        );

        if (matchedOffline && isMounted) {
          const mappedOfflineRecord: CaseRecord = {
            id: matchedOffline.canonicalCaseId,
            incidentReport: {
              id: matchedOffline.localId,
              reportedBy: matchedOffline.reportedByUserId,
              reporterRole: matchedOffline.reporterRole,
              createdAt: matchedOffline.createdAt,
              updatedAt: matchedOffline.createdAt,
              species: matchedOffline.primarySpecies,
              totalAnimals: matchedOffline.totalAnimalsInHerd,
              affectedAnimals: matchedOffline.affectedAnimalCount,
              deadAnimals: matchedOffline.deadAnimalCount,
              symptomIds: matchedOffline.symptomIds,
              onsetDate: matchedOffline.onsetDate,
              durationDays: matchedOffline.durationDays,
              additionalNotes: matchedOffline.additionalNotes,
              location: matchedOffline.location,
              isVaccinated: matchedOffline.isVaccinated,
              vaccineNames: matchedOffline.vaccineNames,
              status: 'reported',
            },
            triageResult: {
              id: `ra-${matchedOffline.canonicalCaseId}`,
              caseId: matchedOffline.canonicalCaseId,
              incidentId: matchedOffline.canonicalCaseId,
              riskScore: 72,
              riskBand: 'high',
              factors: [
                {
                  factorName: 'Offline Field Triage',
                  contribution: 30,
                  evidence: 'Queued on device pending network sync',
                  source: 'farmer_offline_app',
                  direction: 'risk',
                },
              ],
              modelVersion: 'sentinel-offline-preview-v1',
              requiresVeterinaryAssessment: true,
              recommendation: 'Stored locally. Awaiting online synchronization and veterinary triage assignment.',
              disclaimer: 'Offline preliminary report — stored securely on-device.',
              isSynthetic: false,
              computedAt: matchedOffline.createdAt,
            },
            timeline: [
              {
                id: `tl-${matchedOffline.canonicalCaseId}-offline`,
                caseId: matchedOffline.canonicalCaseId,
                timestamp: matchedOffline.createdAt,
                eventType: 'incident_reported',
                actorId: matchedOffline.reportedByUserId,
                actorRole: matchedOffline.reporterRole,
                summary: `Offline incident reported on field device. Canonical ID: ${matchedOffline.canonicalCaseId}`,
              },
            ],
            syncMetadata: matchedOffline.syncMetadata,
          };

          setCaseRecord(mappedOfflineRecord);
          setLoading(false);
          return;
        }

        // 3. Final fallback: SYNTHETIC_CASES
        const fallback = SYNTHETIC_CASES.find(c => c.id === id) || null;
        if (isMounted) {
          setCaseRecord(fallback);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Error fetching case by id:', err);
        if (isMounted) {
          const fallback = SYNTHETIC_CASES.find(c => c.id === id) || null;
          setCaseRecord(fallback);
          setLoading(false);
        }
      }
    }

    fetchCase();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="page-enter text-center py-20 space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">Loading case details...</p>
      </div>
    );
  }

  if (!caseRecord) {
    return (
      <div className="page-enter text-center py-20">
        <p className="text-gray-400 text-lg">Case not found: {id}</p>
        <button className="btn btn-secondary mt-4" onClick={() => navigate('/cases')}>
          ← {t('cases.backToCases', 'Back to Cases')}
        </button>
      </div>
    );
  }

  const { incidentReport: ir, triageResult: tr, vetAssessment: va,
          sampleCollection: sc, labResult: lr, containmentActions: ca,
          vaccinationRecords: vr, treatmentRecords: tx, timeline } = caseRecord;

  const symptoms = ir.symptomIds
    .map(sid => SYMPTOM_CATALOG.find(s => s.id === sid))
    .filter(Boolean);

  const nearbyCluster = SYNTHETIC_CLUSTERS.find(cl => cl.caseIds.includes(caseRecord.id) || cl.affectedDistrict === ir.location.district);

  return (
    <div className="space-y-5 page-enter max-w-5xl mx-auto pb-10">
      {/* Back + header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            onClick={() => navigate('/cases')}
            className="btn btn-secondary btn-sm mt-0.5 flex-shrink-0"
            aria-label="Back to cases"
          >
            <ArrowLeft size={14} /> {t('common.back', 'Back')}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-800 text-gray-900">{caseRecord.id}</h1>
              <Badge variant={ir.status} />
              {tr && <Badge variant={tr.riskBand} />}
              {caseRecord.syncMetadata?.syncStatus === 'PENDING' ? (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-700 border border-amber-200">
                  <WifiOff size={11} /> {t('common.pendingSync', 'Pending Sync (Offline)')}
                </span>
              ) : (
                <span className="synthetic-watermark">Synthetic</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {SPECIES_EMOJI[ir.species]} {ir.species.toUpperCase()} Incident Report ·{' '}
              {ir.location.village}, {ir.location.district} ·{' '}
              Reported {format(new Date(ir.createdAt), 'dd MMM yyyy, HH:mm')}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/vet-console')}
          className="btn btn-primary bg-purple-700 hover:bg-purple-800 btn-sm gap-1 self-stretch sm:self-auto justify-center"
        >
          <Stethoscope size={14} /> Open in Vet Console
        </button>
      </div>

      {/* Offline Pending Sync Notice Banner */}
      {caseRecord.syncMetadata?.syncStatus === 'PENDING' && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5 shadow-xs">
          <WifiOff size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-700 text-amber-900">Stored in Local Offline Queue (Pending Sync)</p>
            <p className="mt-0.5 text-amber-800">
              This field incident report was captured while offline and is safely saved on this device. It will automatically synchronize to the district surveillance network as soon as an internet connection is established.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column — details */}
        <div className="lg:col-span-2 space-y-4">

          {/* Incident Summary Card */}
          <div className="card p-5 space-y-4">
            <h2 className="section-title text-sm mb-2 flex items-center justify-between">
              <span>{t('cases.incidentAnimalDetails', 'Incident & Animal Details')}</span>
              <span className="font-mono text-xs text-gray-400 font-bold">Animal Tag: TAG-MH-2026-{caseRecord.id.slice(-4)}</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 font-600 uppercase">{t('cases.caseId', 'Case ID')}</p>
                <p className="font-700 font-mono text-purple-700 mt-0.5">{caseRecord.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-600 uppercase">{t('common.speciesLabel', 'Species')}</p>
                <p className="font-600 capitalize mt-0.5">{ir.species}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-600 uppercase">{t('cases.totalHerdCount', 'Total Herd Count')}</p>
                <p className="font-600 mt-0.5">{ir.totalAnimals} animals</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-600 uppercase">{t('cases.affectedCount', 'Affected Count')}</p>
                <p className="font-600 text-amber-700 mt-0.5">{ir.affectedAnimals} affected</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-600 uppercase">{t('cases.mortality', 'Mortality (Dead)')}</p>
                <p className={`font-700 mt-0.5 ${ir.deadAnimals > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                  {ir.deadAnimals} dead
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-600 uppercase">{t('cases.onsetDuration', 'Onset & Duration')}</p>
                <p className="font-600 mt-0.5">{format(new Date(ir.onsetDate), 'dd MMM')} ({ir.durationDays} day(s))</p>
              </div>
              <div className="col-span-2 sm:col-span-3 border-t pt-2 mt-1">
                <p className="text-xs text-gray-400 font-600 uppercase mb-1">{t('cases.geographicLocation', 'Geographic Location')}</p>
                <p className="font-600 text-xs flex items-center gap-1">
                  <MapPin size={13} className="text-red-500" />
                  {ir.location.village}, {ir.location.block}, {ir.location.district}, {ir.location.state}
                  <span className="text-gray-400 font-mono text-[11px] ml-1">
                    ({ir.location.latitude}, {ir.location.longitude})
                  </span>
                </p>
              </div>
              <div className="col-span-2 sm:col-span-3 border-t pt-2">
                <p className="text-xs text-gray-400 font-600 uppercase mb-1">{t('cases.vaccinationStatus', 'Vaccination Status')}</p>
                <p className="font-600 text-xs">
                  {ir.isVaccinated ? `✅ ${t('cases.vaccinated', 'Vaccinated')} — ${ir.vaccineNames ?? t('cases.recorded', 'Recorded')}` : `❌ ${t('cases.unvaccinatedHerd', 'Unvaccinated Herd')}`}
                </p>
              </div>
            </div>

            {/* Symptoms list */}
            <div className="mt-3">
              <p className="text-xs text-gray-400 font-600 uppercase mb-2">{t('cases.reportedSymptoms', 'Reported Symptoms')}</p>
              <div className="flex flex-wrap gap-1.5">
                {symptoms.map(s => s && (
                  <span key={s.id} className="chip bg-purple-50 text-purple-800 border-purple-200">{s.label}</span>
                ))}
              </div>
            </div>

            {ir.additionalNotes && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                <p className="text-xs text-gray-400 font-600 uppercase mb-1">{t('cases.reporterNotes', 'Reporter Notes')}</p>
                <p className="text-gray-700">{ir.additionalNotes}</p>
              </div>
            )}
          </div>

          {/* AI Triage Breakdown */}
          {tr && (
            <div>
              <h2 className="section-title text-sm mb-3">{t('cases.aiTriageRiskBreakdown', 'AI Triage Risk Breakdown')}</h2>
              <AIExplanationPanel triage={tr} />
            </div>
          )}

          {/* Veterinary Field Visit & Clinical Assessment */}
          {va && (
            <div className="card p-5 space-y-3 bg-white">
              <h2 className="section-title text-sm mb-3 flex items-center justify-between border-b pb-2">
                <span className="flex items-center gap-2">
                  <Stethoscope size={16} className="text-purple-700" />
                  {t('cases.veterinaryFieldVisitRecord', 'Veterinary Field Visit Record')}
                </span>
                <span className="text-xs text-purple-700 font-600 font-mono">
                  {format(new Date(va.assessedAt), 'dd MMM yyyy, HH:mm')}
                </span>
              </h2>

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-xs">
                <p className="font-700 text-purple-900 text-sm">{va.clinicalDiagnosis ?? 'Clinical Field Visit Recorded'}</p>
                {va.temperatureCelsius && (
                  <p className="text-purple-700 font-600 mt-1">{t('cases.bodyTemperature', 'Body Temperature')}: {va.temperatureCelsius}°C</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-400 font-600 uppercase mb-1">{t('cases.clinicalObservations', 'Clinical Observations & Findings')}</p>
                <p className="text-xs text-gray-800 leading-relaxed bg-gray-50 p-3 rounded border">{va.clinicalFindings}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-xs text-gray-400 font-600 uppercase mb-0.5">{t('cases.aiTriageAgreement', 'AI Triage Agreement')}</p>
                  <p className="font-600">{va.agreedWithAiRisk ? `✅ ${t('cases.agreedWithAiRisk', 'Agreed with AI Risk Score')}` : `⚠️ ${t('cases.revisedRisk', 'Revised Risk')}: ${va.revisedRiskBand}`}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-600 uppercase mb-0.5">{t('cases.quarantineIsolation', 'Quarantine Isolation')}</p>
                  <p className="font-600">{va.quarantineRecommended ? `⚠️ ${t('cases.recommendedIsolation', 'Recommended Isolation')}` : `✅ ${t('cases.standardMonitoring', 'Standard Monitoring')}`}</p>
                </div>
              </div>

              {/* Photos Gallery */}
              {va.photos && va.photos.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-gray-400 font-600 uppercase mb-2 flex items-center gap-1">
                    <Camera size={13} /> {t('cases.fieldVisitPhotos', 'Field Visit Photos')}
                  </p>
                  <div className="flex gap-2 overflow-x-auto">
                    {va.photos.map((url, i) => (
                      <img key={i} src={url} alt={`Lesion ${i+1}`} className="w-24 h-20 object-cover rounded-lg border" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sample Chain of Custody */}
          {sc && (
            <div className="card p-5 space-y-3">
              <h2 className="section-title text-sm mb-3 flex items-center gap-2 border-b pb-2">
                <FlaskConical size={16} className="text-amber-600" />
                {t('cases.sampleCollectionTransportStatus', 'Sample Collection & Transport Status')}
              </h2>
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="font-mono font-700 text-amber-900 bg-amber-100 px-2.5 py-1 rounded border border-amber-200">
                  Barcode: {sc.barcode}
                </span>
                <span className="text-gray-600">{t('cases.sampleType', 'Sample Type')}: <strong>{sc.sampleType}</strong></span>
                <span className="text-gray-600">{t('cases.lab', 'Lab')}: <strong>{sc.destinationLab}</strong></span>
              </div>

              <div className="space-y-2 pt-2">
                {sc.chainOfCustody.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-700 flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-700 text-gray-800">{CHAIN_STEP_LABELS[step.step] ?? step.step}</p>
                      <p className="text-gray-400 text-[11px]">
                        {step.handledBy} · {format(new Date(step.timestamp), 'dd MMM, HH:mm')}
                      </p>
                      {step.notes && <p className="text-gray-600 text-[11px] mt-0.5">{step.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lab Result Outcome */}
              {lr && (
                <div className={`mt-3 p-3 rounded-lg border-l-4 ${
                  lr.status === 'positive' ? 'bg-red-50 border-red-500 text-red-900' :
                  lr.status === 'negative' ? 'bg-green-50 border-green-500 text-green-900' :
                  'bg-gray-50 border-gray-300'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-700 text-xs">{t('cases.laboratoryTest', 'Laboratory Test')}: {lr.testName}</p>
                    <Badge variant={lr.status} size="sm" />
                  </div>
                  {lr.pathogen && (
                    <p className="text-xs font-700">
                      Confirmed Pathogen: {lr.pathogen}
                      {lr.serotype && ` — Serotype ${lr.serotype}`}
                    </p>
                  )}
                  {lr.notes && <p className="text-[11px] text-gray-600 mt-1">{lr.notes}</p>}
                </div>
              )}
            </div>
          )}

          {/* Vaccination & Treatment Records */}
          {((vr && vr.length > 0) || (tx && tx.length > 0)) && (
            <div className="card p-5 space-y-4">
              <h2 className="section-title text-sm mb-2 border-b pb-2">{t('cases.treatmentsVaccinationHistory', 'Treatments & Vaccination History')}</h2>

              {vr && vr.length > 0 && (
                <div>
                  <p className="text-xs font-700 text-blue-800 mb-2 flex items-center gap-1">
                    <Syringe size={14} /> {t('cases.vaccinationHistory', 'Vaccination History')}
                  </p>
                  <div className="space-y-1.5">
                    {vr.map((v, idx) => (
                      <div key={idx} className="p-2.5 bg-blue-50/50 rounded border text-xs flex justify-between">
                        <div>
                          <strong className="text-blue-900">{v.vaccineName}</strong>
                          <p className="text-gray-500 text-[11px]">Batch: {v.batchNumber || 'N/A'}</p>
                        </div>
                        <span className="text-gray-500">{v.administeredAt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tx && tx.length > 0 && (
                <div>
                  <p className="text-xs font-700 text-emerald-800 mb-2 flex items-center gap-1">
                    <Pill size={14} /> {t('cases.prescribedTreatments', 'Prescribed Treatments')}
                  </p>
                  <div className="space-y-1.5">
                    {tx.map((t, idx) => (
                      <div key={idx} className="p-2.5 bg-emerald-50/50 rounded border text-xs">
                        <strong className="text-emerald-900">{t.medicationName}</strong>
                        <p className="text-gray-600 text-[11px]">Dosage: {t.dosage}</p>
                        {t.instructions && <p className="text-gray-500 text-[11px]">{t.instructions}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Containment & Response Actions */}
          {ca && ca.length > 0 && (
            <div className="card p-5 space-y-3">
              <h2 className="section-title text-sm mb-3">{t('cases.responseContainmentActions', 'Response & Containment Actions')}</h2>
              <div className="space-y-2">
                {ca.map(action => (
                  <div key={action.id} className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-700 text-blue-900 capitalize">
                        {action.type.replace('_', ' ')}
                      </p>
                      <Badge variant="contained" label={action.status.replace('_', ' ')} size="sm" />
                    </div>
                    <p className="text-blue-800 mt-1">{action.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right column — Context, Vet Assignment, Timeline */}
        <div className="space-y-4">

          {/* Assigned Vet & Status */}
          <div className="card p-4 space-y-2">
            <h2 className="section-title text-xs uppercase text-gray-500 font-700">{t('cases.assignedVeterinarian', 'Assigned Veterinarian')}</h2>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-800 font-700 flex items-center justify-center text-sm">
                AD
              </div>
              <div className="text-xs">
                <p className="font-700 text-gray-900">Dr. Anand Deshmukh</p>
                <p className="text-gray-500">District Veterinary Officer (Nashik)</p>
              </div>
            </div>
          </div>

          {/* Nearby Cluster Context */}
          {nearbyCluster && (
            <div className="card p-4 space-y-2 border-l-4 border-amber-500 bg-amber-50/50">
              <h2 className="section-title text-xs uppercase text-amber-900 font-700 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-amber-600" />
                {t('cases.nearbyOutbreakCluster', 'Nearby Outbreak Cluster')}
              </h2>
              <p className="text-xs font-700 text-amber-950">{nearbyCluster.clusterName}</p>
              <p className="text-[11px] text-amber-800">
                Primary Disease: <strong>{nearbyCluster.primaryDisease}</strong> · Active Cases: <strong>{nearbyCluster.activeCaseCount}</strong>
              </p>
              <p className="text-[11px] text-amber-700">
                Response: {nearbyCluster.responseStatus}
              </p>
            </div>
          )}

          {/* Canonical Case Timeline */}
          <div className="card p-4">
            <h2 className="section-title text-sm mb-4 flex items-center gap-1.5">
              <Calendar size={15} className="text-gray-500" />
              Canonical Case Timeline
            </h2>
            <CaseTimeline events={timeline} />
          </div>

          {/* Reporter & Contact Info */}
          <div className="card p-4 text-xs space-y-2">
            <h2 className="section-title text-xs uppercase text-gray-500 font-700">{t('cases.farmerReporterInfo', 'Farmer & Reporter Info')}</h2>
            <p className="text-gray-700 font-600">{t('cases.reporter', 'Reporter')}: Ramesh Kumar ({t('roles.farmer', 'Farmer')})</p>
            <p className="text-gray-500">{t('cases.location', 'Location')}: {ir.location.village}, {ir.location.block}</p>
            <p className="text-gray-500 font-mono">{t('cases.reportedAt', 'Reported At')}: {format(new Date(ir.createdAt), 'dd MMM yyyy, HH:mm')}</p>
          </div>

        </div>
      </div>
    </div>
  );
}
