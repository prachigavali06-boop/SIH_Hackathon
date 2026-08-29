import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, Calendar, FlaskConical } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '../components/ui/Badge';
import { AIExplanationPanel } from '../components/ui/AIExplanationPanel';
import { CaseTimeline } from '../components/ui/CaseTimeline';
import { SYNTHETIC_CASES, SYMPTOM_CATALOG } from '../data/seed';
import { getCaseById } from '../services/api';
import type { CaseRecord } from '../types';

const SPECIES_EMOJI: Record<string, string> = {
  cattle: '🐄', buffalo: '🐃', goat: '🐐',
  sheep: '🐑', pig: '🐷', poultry: '🐔', equine: '🐴', other: '🐾',
};

const CHAIN_STEP_LABELS: Record<string, string> = {
  Collected:  '🧪 Collected',
  Dispatched: '🚐 Dispatched',
  Received:   '🏥 Received at Lab',
};

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getCaseById(id)
      .then(res => {
        if (!isMounted) return;
        if (res) {
          setCaseRecord(res);
        } else {
          const fallback = SYNTHETIC_CASES.find(c => c.id === id) || null;
          setCaseRecord(fallback);
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.warn('Error fetching case by id:', err);
        const fallback = SYNTHETIC_CASES.find(c => c.id === id) || null;
        setCaseRecord(fallback);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

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
          ← Back to Cases
        </button>
      </div>
    );
  }

  const { incidentReport: ir, triageResult: tr, vetAssessment: va,
          sampleCollection: sc, labResult: lr, containmentActions: ca, timeline } = caseRecord;

  const symptoms = ir.symptomIds
    .map(sid => SYMPTOM_CATALOG.find(s => s.id === sid))
    .filter(Boolean);

  return (
    <div className="space-y-5 page-enter max-w-5xl mx-auto">
      {/* Back + header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/cases')}
          className="btn btn-secondary btn-sm mt-0.5"
          aria-label="Back to cases"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-800 text-gray-900">{caseRecord.id}</h1>
            <Badge variant={ir.status} />
            {tr && <Badge variant={tr.riskBand} />}
            <span className="synthetic-watermark">Synthetic</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {SPECIES_EMOJI[ir.species]} {ir.species} ·{' '}
            {ir.location.village}, {ir.location.district} ·{' '}
            Reported {format(new Date(ir.createdAt), 'dd MMM yyyy, HH:mm')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column — details */}
        <div className="lg:col-span-2 space-y-4">

          {/* Incident summary */}
          <div className="card p-4">
            <h2 className="section-title text-sm mb-4">Incident Report</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 font-600 uppercase">Species</p>
                <p className="font-600 capitalize mt-0.5">{ir.species}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-600 uppercase">Total Animals</p>
                <p className="font-600 mt-0.5">{ir.totalAnimals}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-600 uppercase">Affected</p>
                <p className="font-600 text-amber-700 mt-0.5">{ir.affectedAnimals}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-600 uppercase">Deaths</p>
                <p className={`font-600 mt-0.5 ${ir.deadAnimals > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                  {ir.deadAnimals}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-600 uppercase">Onset Date</p>
                <p className="font-600 mt-0.5">{format(new Date(ir.onsetDate), 'dd MMM yyyy')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-600 uppercase">Duration</p>
                <p className="font-600 mt-0.5">{ir.durationDays} day(s)</p>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-gray-400 font-600 uppercase mb-1">Location</p>
                <p className="font-600 flex items-center gap-1">
                  <MapPin size={13} className="text-red-500" />
                  {ir.location.village}, {ir.location.block}, {ir.location.district}, {ir.location.state}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-gray-400 font-600 uppercase mb-1">Vaccination</p>
                <p className="font-600">
                  {ir.isVaccinated ? `✅ Vaccinated — ${ir.vaccineNames ?? 'Unknown vaccine'}` : '❌ Not Vaccinated'}
                </p>
              </div>
            </div>

            {/* Symptoms */}
            <div className="mt-4">
              <p className="text-xs text-gray-400 font-600 uppercase mb-2">Reported Symptoms</p>
              <div className="flex flex-wrap gap-1.5">
                {symptoms.map(s => s && (
                  <span key={s.id} className="chip">{s.label}</span>
                ))}
              </div>
            </div>

            {ir.additionalNotes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-400 font-600 uppercase mb-1">Additional Notes</p>
                <p className="text-sm text-gray-700">{ir.additionalNotes}</p>
              </div>
            )}
          </div>

          {/* AI Triage */}
          {tr && (
            <div>
              <h2 className="section-title text-sm mb-3">AI Triage Result</h2>
              <AIExplanationPanel triage={tr} />
            </div>
          )}

          {/* Vet Assessment */}
          {va && (
            <div className="card p-4">
              <h2 className="section-title text-sm mb-4">
                <User size={15} className="text-purple-600" />
                Veterinary Assessment
              </h2>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="font-700 text-purple-800">{va.clinicalDiagnosis ?? 'Assessment recorded'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-600 uppercase mb-1">Clinical Findings</p>
                  <p className="text-gray-700">{va.clinicalFindings}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 font-600 uppercase mb-1">AI Assessment Agreement</p>
                    <p className="font-600">{va.agreedWithAiRisk ? '✅ Agreed' : '⚠️ Revised'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-600 uppercase mb-1">Quarantine</p>
                    <p className="font-600">{va.quarantineRecommended ? '⚠️ Recommended' : '✅ Not Required'}</p>
                  </div>
                </div>
                {va.treatmentRecommended && (
                  <div>
                    <p className="text-xs text-gray-400 font-600 uppercase mb-1">Treatment Recommended</p>
                    <p className="text-gray-700">{va.treatmentRecommended}</p>
                  </div>
                )}
                <p className="text-xs text-gray-400 font-mono">
                  Assessed: {format(new Date(va.assessedAt), 'dd MMM yyyy, HH:mm')}
                </p>
              </div>
            </div>
          )}

          {/* Sample & Lab */}
          {sc && (
            <div className="card p-4">
              <h2 className="section-title text-sm mb-4">
                <FlaskConical size={15} className="text-amber-600" />
                Sample Chain of Custody
              </h2>
              <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
                <span className="font-mono font-700 text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                  {sc.barcode}
                </span>
                <span className="text-gray-500">→ {sc.destinationLab}</span>
              </div>
              <div className="space-y-2">
                {sc.chainOfCustody.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-700 flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-600">{CHAIN_STEP_LABELS[step.step] ?? step.step}</p>
                      <p className="text-xs text-gray-400">
                        {step.handledBy} · {format(new Date(step.timestamp), 'dd MMM, HH:mm')}
                      </p>
                      {step.notes && <p className="text-xs text-gray-500 mt-0.5">{step.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lab result */}
              {lr && (
                <div className={`mt-4 p-3 rounded-lg border-l-4 ${
                  lr.status === 'positive' ? 'bg-red-50 border-red-500' :
                  lr.status === 'negative' ? 'bg-green-50 border-green-500' :
                  'bg-gray-50 border-gray-300'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-700 text-sm">Lab Result: {lr.testName}</p>
                    <Badge variant={lr.status} size="sm" />
                  </div>
                  {lr.pathogen && (
                    <p className="text-sm font-600">
                      Pathogen: {lr.pathogen}
                      {lr.serotype && ` — Serotype ${lr.serotype}`}
                    </p>
                  )}
                  {lr.notes && <p className="text-xs text-gray-500 mt-1">{lr.notes}</p>}
                </div>
              )}
            </div>
          )}

          {/* Containment actions */}
          {ca && ca.length > 0 && (
            <div className="card p-4">
              <h2 className="section-title text-sm mb-4">Containment Actions</h2>
              <div className="space-y-3">
                {ca.map(action => (
                  <div key={action.id} className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-700 text-sm text-blue-900 capitalize">
                        {action.type.replace('_', ' ')}
                      </p>
                      <Badge
                        variant={
                          action.status === 'completed' ? 'negative' :
                          action.status === 'in_progress' ? 'pending' :
                          action.status === 'planned' ? 'contained' : 'info'
                        }
                        label={action.status.replace('_', ' ')}
                        size="sm"
                      />
                    </div>
                    <p className="text-xs text-blue-700 mt-1">{action.description}</p>
                    {action.affectedVillages && (
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        {action.affectedVillages.map(v => (
                          <span key={v} className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — timeline */}
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="section-title text-sm mb-4">
              <Calendar size={15} className="text-gray-500" />
              Case Timeline
            </h2>
            <CaseTimeline events={timeline} />
          </div>

          {/* Reporter info */}
          <div className="card p-4">
            <h2 className="section-title text-sm mb-3">Reporter</h2>
            <div className="text-sm space-y-1">
              <p className="text-gray-600">
                Role: <span className="font-600 capitalize">{ir.reporterRole.replace('_', ' ')}</span>
              </p>
              <p className="text-gray-600">
                District: <span className="font-600">{ir.location.district}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
