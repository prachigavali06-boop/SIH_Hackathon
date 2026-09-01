// ============================================================
// VetConsolePage — Module 6: Veterinary Escalation Console
// Veterinary confirmation gate for AI risk & sample ordering
// ============================================================

import { useState, useEffect } from 'react';
import { Stethoscope, CheckCircle2, ShieldCheck, FlaskConical, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { SYNTHETIC_CASES, DISEASE_INFO } from '../data/seed';
import type { CaseRecord, SuspectedDisease, RiskBand } from '../types';
import { Badge } from '../components/ui/Badge';
import { AIExplanationPanel } from '../components/ui/AIExplanationPanel';
import { getCases, recordFieldVisit, createSample } from '../services/api';
import { useAuthStore } from '../store/authStore';

export function VetConsolePage() {
  const { currentUser } = useAuthStore();

  // Live cases — seeded with SYNTHETIC_CASES so the queue is never empty
  // on first render while getCases() resolves.
  const [cases, setCases] = useState<CaseRecord[]>([...SYNTHETIC_CASES]);
  const [selectedCase, setSelectedCase] = useState<CaseRecord>(SYNTHETIC_CASES[0]);

  // Vet Form State
  const [clinicalFindings, setClinicalFindings] = useState('');
  const [agreedWithAi, setAgreedWithAi] = useState(true);
  const [revisedRisk, setRevisedRisk] = useState<RiskBand>('high');
  const [selectedDisease, setSelectedDisease] = useState<SuspectedDisease>('FMD');
  const [requiresSample, setRequiresSample] = useState(true);
  const [quarantineRecommended, setQuarantineRecommended] = useState(true);
  const [treatment, setTreatment] = useState('Symptomatic treatment, antiseptic mouth wash, isolation.');
  const [assessmentSubmitted, setAssessmentSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load live cases from localCasesStore on mount (no re-fetch on interaction).
  // Prioritizes unassessed cases so new reports are highlighted immediately.
  useEffect(() => {
    let mounted = true;
    getCases()
      .then(liveCases => {
        if (!mounted) return;
        const list = liveCases.length > 0 ? liveCases : SYNTHETIC_CASES;
        setCases(list);

        // Prioritize unassessed case (no vetAssessment) first, or fallback to first case
        const unassessedCase = list.find(c => !c.vetAssessment);
        const targetCase = unassessedCase ?? list[0];

        setSelectedCase(targetCase);
        setClinicalFindings(targetCase.vetAssessment?.clinicalFindings ?? '');
        setAgreedWithAi(targetCase.vetAssessment?.agreedWithAiRisk ?? true);
        if (targetCase.vetAssessment?.revisedRiskBand) {
          setRevisedRisk(targetCase.vetAssessment.revisedRiskBand);
        }
        if (targetCase.vetAssessment?.clinicalDiagnosis) {
          const cd = targetCase.vetAssessment.clinicalDiagnosis;
          const matched: SuspectedDisease =
            cd.includes('LSD') ? 'LSD' :
            cd.includes('PPR') ? 'PPR' :
            cd.includes('BQ') ? 'BQ' :
            cd.includes('Anthrax') ? 'Anthrax' :
            cd.includes('Rabies') ? 'Rabies' : 'FMD';
          setSelectedDisease(matched);
        }
      })
      .catch(() => {
        // SYNTHETIC_CASES already in state — nothing to do.
      });
    return () => { mounted = false; };
  }, []);

  const handleSelectCase = (c: CaseRecord) => {
    setSelectedCase(c);
    setClinicalFindings(c.vetAssessment?.clinicalFindings ?? '');
    setAgreedWithAi(c.vetAssessment?.agreedWithAiRisk ?? true);
    setRevisedRisk(c.vetAssessment?.revisedRiskBand ?? c.triageResult?.riskBand ?? 'high');
    if (c.vetAssessment?.clinicalDiagnosis) {
      const cd = c.vetAssessment.clinicalDiagnosis;
      const matched: SuspectedDisease =
        cd.includes('LSD') ? 'LSD' :
        cd.includes('PPR') ? 'PPR' :
        cd.includes('BQ') ? 'BQ' :
        cd.includes('Anthrax') ? 'Anthrax' :
        cd.includes('Rabies') ? 'Rabies' : 'FMD';
      setSelectedDisease(matched);
    }
    setRequiresSample(c.vetAssessment?.requiresSample ?? true);
    setQuarantineRecommended(c.vetAssessment?.quarantineRecommended ?? true);
    setTreatment(c.vetAssessment?.notes ?? 'Symptomatic treatment, antiseptic mouth wash, isolation.');
    setAssessmentSubmitted(false);
    setSaveError(null);
  };

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const visitDate = new Date().toISOString();
      const vetUserId = currentUser?.id || 'u-vet-01';

      // 1. Record Field Visit & Clinical Assessment in localCasesStore
      await recordFieldVisit({
        caseId: selectedCase.id,
        visitedByUserId: vetUserId,
        visitorRole: currentUser?.role || 'veterinarian',
        visitedAt: visitDate,
        clinicalObservations: clinicalFindings,
        agreedWithAiRisk: agreedWithAi,
        revisedRiskBand: agreedWithAi ? selectedCase.triageResult?.riskBand : revisedRisk,
        clinicalDiagnosis: selectedDisease,
        quarantineRecommended,
        sampleRequired: requiresSample,
        notes: treatment,
      });

      // 2. If sample required, create Sample record in localCasesStore
      let createdSampleObj = undefined;
      if (requiresSample) {
        createdSampleObj = await createSample({
          caseId: selectedCase.id,
          sampleType: 'Blood Serum',
          collectedByUserId: vetUserId,
          collectedAt: visitDate,
          animalCountSampled: selectedCase.incidentReport.affectedAnimals || 1,
          destinationLabName: 'NRFMD Regional Lab, Pune',
        });
      }

      // Update local state in VetConsolePage
      const updatedAssessment = {
        vetId: vetUserId,
        assessedAt: visitDate,
        clinicalFindings,
        agreedWithAiRisk: agreedWithAi,
        revisedRiskBand: agreedWithAi ? selectedCase.triageResult?.riskBand : revisedRisk,
        requiresSample,
        quarantineRecommended,
      };
      const updatedStatus = requiresSample ? 'sample_collected' : 'vet_assessed';

      setCases(prev => prev.map(c => {
        if (c.id !== selectedCase.id) return c;
        return {
          ...c,
          vetAssessment: updatedAssessment,
          sampleCollection: createdSampleObj ? {
            ...createdSampleObj,
            sampleId: createdSampleObj.id,
            collectedBy: createdSampleObj.collectedByUserId,
            destinationLabName: createdSampleObj.destinationLabName,
            destinationLab: createdSampleObj.destinationLabName,
            animalCountSampled: createdSampleObj.animalCountSampled,
            animalCount: createdSampleObj.animalCountSampled,
          } : c.sampleCollection,
          incidentReport: {
            ...c.incidentReport,
            status: updatedStatus,
          },
        };
      }));

      setSelectedCase(prev => ({
        ...prev,
        vetAssessment: updatedAssessment,
        sampleCollection: createdSampleObj ? {
          ...createdSampleObj,
          sampleId: createdSampleObj.id,
          collectedBy: createdSampleObj.collectedByUserId,
          destinationLabName: createdSampleObj.destinationLabName,
          destinationLab: createdSampleObj.destinationLabName,
          animalCountSampled: createdSampleObj.animalCountSampled,
          animalCount: createdSampleObj.animalCountSampled,
        } : prev.sampleCollection,
        incidentReport: {
          ...prev.incidentReport,
          status: updatedStatus,
        },
      }));

      setAssessmentSubmitted(true);
    } catch (err) {
      console.error('Failed to save veterinary assessment:', err);
      setSaveError('Failed to save assessment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title text-xl">
            <Stethoscope size={22} className="text-purple-700" />
            Veterinary Escalation Console
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Human-in-the-Loop Verification · Vet Confirmation Required Before Official Response
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-suspected">Veterinarian Access</span>
          <span className="synthetic-watermark">Synthetic Data</span>
        </div>
      </div>

      {/* Safety Banner */}
      <div className="alert-banner info">
        <ShieldCheck size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900">
          <strong>Domain Safety Rule:</strong> AI scores provide triaged recommendations. No automated containment or official diagnosis occurs without explicit clinical validation by a registered Veterinary Officer.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Priority Case Queue */}
        <div className="space-y-3">
          <h2 className="text-xs font-700 text-gray-500 uppercase tracking-wider">
            Assigned Priority Queue ({cases.length})
          </h2>

          {cases.map(c => {
            const isSelected = c.id === selectedCase.id;
            const tr = c.triageResult;
            return (
              <div
                key={c.id}
                onClick={() => handleSelectCase(c)}
                className={`card p-4 cursor-pointer transition-all ${
                  isSelected ? 'border-purple-600 ring-2 ring-purple-600/20 bg-purple-50/30' : 'hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-gray-400">{c.id}</span>
                    <h3 className="font-700 text-sm text-gray-900 capitalize mt-0.5">
                      {c.incidentReport.species} ({c.incidentReport.affectedAnimals} affected)
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {c.incidentReport.location.village}, {c.incidentReport.location.district}
                    </p>
                  </div>
                  {tr && <Badge variant={tr.riskBand} size="sm" />}
                </div>

                <div className="flex items-center justify-between mt-3 text-xs border-t pt-2 border-gray-100">
                  <span className="text-gray-400">
                    {format(new Date(c.incidentReport.createdAt), 'dd MMM, HH:mm')}
                  </span>
                  <span className="font-600 text-purple-700">
                    {c.vetAssessment ? '✓ Assessed' : 'Needs Assessment'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Assessment Workspace */}
        <div className="lg:col-span-2 space-y-6">

          {/* Case Context Summary */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-2">
              <div>
                <span className="font-mono text-xs text-gray-400">Case ID: {selectedCase.id}</span>
                <h2 className="text-lg font-800 text-gray-900 capitalize">
                  {selectedCase.incidentReport.species} Incident Report
                </h2>
              </div>
              <Badge variant={selectedCase.incidentReport.status} />
            </div>

            {/* AI Triage explanation */}
            {selectedCase.triageResult && (
              <div>
                <h3 className="text-xs font-700 text-gray-500 uppercase tracking-wider mb-2">
                  AI Triage Breakdown
                </h3>
                <AIExplanationPanel triage={selectedCase.triageResult} />
              </div>
            )}
          </div>

          {/* Clinical Assessment Form */}
          <form onSubmit={handleSaveAssessment} className="card p-5 space-y-5">
            <h2 className="text-sm font-700 text-purple-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
              <Stethoscope size={16} />
              Veterinary Clinical Evaluation
            </h2>

            {assessmentSubmitted && (
              <div className="alert-banner success">
                <CheckCircle2 size={18} />
                <div>
                  <strong>Veterinary Assessment Recorded!</strong>
                  <p className="text-xs">Escalated to Sample Collection & Laboratory Tracking.</p>
                </div>
              </div>
            )}

            {saveError && (
              <div className="alert-banner danger flex items-center gap-2">
                <AlertTriangle size={16} />
                <div>
                  <strong>Error Saving Assessment</strong>
                  <p className="text-xs">{saveError}</p>
                </div>
              </div>
            )}

            {/* Agreed with AI? */}
            <div>
              <label className="form-label text-xs">Confirm AI Risk Classification?</label>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer font-500">
                  <input
                    type="radio"
                    name="aiAgree"
                    checked={agreedWithAi}
                    onChange={() => setAgreedWithAi(true)}
                    className="accent-purple-600"
                  />
                  Confirm AI Risk Assessment ({selectedCase.triageResult?.riskBand ?? 'High'})
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer font-500">
                  <input
                    type="radio"
                    name="aiAgree"
                    checked={!agreedWithAi}
                    onChange={() => setAgreedWithAi(false)}
                    className="accent-purple-600"
                  />
                  Revise Risk Assessment
                </label>
              </div>
            </div>

            {!agreedWithAi && (
              <div>
                <label className="form-label text-xs">Revised Clinical Risk Band</label>
                <select
                  value={revisedRisk}
                  onChange={e => setRevisedRisk(e.target.value as RiskBand)}
                  className="form-select"
                >
                  <option value="low">Low Risk</option>
                  <option value="moderate">Moderate Risk</option>
                  <option value="high">High Risk</option>
                  <option value="critical">Critical Outbreak Risk</option>
                </select>
              </div>
            )}

            {/* Suspected Disease */}
            <div>
              <label className="form-label text-xs">Clinical Suspected Disease</label>
              <select
                value={selectedDisease}
                onChange={e => setSelectedDisease(e.target.value as SuspectedDisease)}
                className="form-select"
              >
                {Object.entries(DISEASE_INFO).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.name} ({key})
                  </option>
                ))}
              </select>
            </div>

            {/* Clinical Observations */}
            <div>
              <label className="form-label text-xs">Clinical Findings & Lesion Description</label>
              <textarea
                value={clinicalFindings}
                onChange={e => setClinicalFindings(e.target.value)}
                placeholder="Enter physical examination details, vesicle appearance, rectal temp, etc…"
                className="form-textarea"
                rows={3}
                required
              />
            </div>

            {/* Recommended Interventions */}
            <div className="space-y-3 pt-2 border-t">
              <label className="form-label text-xs">Immediate Actions & Escalation</label>

              <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresSample}
                  onChange={e => setRequiresSample(e.target.checked)}
                  className="accent-purple-600 rounded"
                />
                <span className="font-600 flex items-center gap-1">
                  <FlaskConical size={14} className="text-amber-600" />
                  Order Laboratory Sample Collection & Cold Chain Dispatch
                </span>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quarantineRecommended}
                  onChange={e => setQuarantineRecommended(e.target.checked)}
                  className="accent-purple-600 rounded"
                />
                <span className="font-600 text-red-700">
                  Recommend Local Herd Isolation / Village Movement Quarantine
                </span>
              </label>
            </div>

            <div>
              <label className="form-label text-xs">Prescribed Supportive Treatment</label>
              <input
                type="text"
                value={treatment}
                onChange={e => setTreatment(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary bg-purple-700 hover:bg-purple-800 disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving Assessment...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Save Assessment & Order Lab Sample
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
