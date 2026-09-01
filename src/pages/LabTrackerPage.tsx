// ============================================================
// LabTrackerPage — Module 7: Sample Collection & Lab Tracking
// Chain of custody tracking · Lab result entry · Alert on positive
// Member 6 — Laboratory, Alerts & Vaccination Analytics
// ============================================================

import { useState, useEffect } from 'react';
import {
  FlaskConical, CheckCircle2, QrCode, Truck, Check,
  AlertTriangle, Loader2, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import type { CaseRecord, LabResultStatus, SuspectedDisease } from '../types';
import { Badge } from '../components/ui/Badge';
import { SYNTHETIC_CASES } from '../data/seed';
import { getCases, submitLabResult, updateSample } from '../services/api';
import { createAlert } from '../services/platform';
import { useNotificationStore } from '../store/notificationStore';

// Chain of custody ordered steps
const CHAIN_STEPS = ['Collected', 'Dispatched', 'Received', 'Testing'] as const;
type ChainStep = typeof CHAIN_STEPS[number];

export function LabTrackerPage() {
  // Live case list
  const [cases, setCases] = useState<CaseRecord[]>([...SYNTHETIC_CASES]);
  const [loadingCases, setLoadingCases] = useState(true);

  // Selected case
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);

  // Tab state — no API call on switch, purely derived from existing `cases`
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  // Form state
  const [testName, setTestName] = useState('RT-PCR FMD Serotyping');
  const [status, setStatus] = useState<LabResultStatus>('positive');
  const [pathogen, setPathogen] = useState('');
  const [serotype, setSerotype] = useState('');
  const [ctValue, setCtValue] = useState<string>('');
  const [confirmedDisease, setConfirmedDisease] = useState<SuspectedDisease>('FMD');
  const [notes, setNotes] = useState('');

  // Submission state
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Chain-of-custody advancement state
  const [advancingStep, setAdvancingStep] = useState(false);

  const { addNotification } = useNotificationStore();

  // ----------------------------------------------------------------
  // Load live cases on mount (single call — no re-fetch on tab switch)
  // ----------------------------------------------------------------
  useEffect(() => {
    let mounted = true;
    getCases()
      .then(liveCases => {
        if (!mounted) return;
        const withSamples = liveCases.filter(c => c.sampleCollection);
        const list = withSamples.length > 0 ? withSamples : SYNTHETIC_CASES.filter(c => c.sampleCollection);
        setCases(list);

        // Pick first active case (pending lab result) if available, else first case
        const firstActive = list.find(
          c => c.incidentReport.status !== 'confirmed' && c.incidentReport.status !== 'result_negative' && !c.labResult
        );
        if (firstActive) {
          setSelectedCase(firstActive);
        } else if (list.length > 0) {
          setSelectedCase(list[0]);
        }
      })
      .catch(() => {
        // Fallback already set — initial state seeds SYNTHETIC_CASES
      })
      .finally(() => {
        if (mounted) setLoadingCases(false);
      });
    return () => { mounted = false; };
  }, []);

  // ----------------------------------------------------------------
  // Synchronize form fields whenever selectedCase changes
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!selectedCase) {
      setTestName('RT-PCR FMD Serotyping');
      setStatus('positive');
      setPathogen('');
      setSerotype('');
      setCtValue('');
      setConfirmedDisease('FMD');
      setNotes('');
      setIsSaved(false);
      setSaveError(null);
      return;
    }

    if (selectedCase.labResult) {
      const lr = selectedCase.labResult;
      setTestName(lr.testName || 'RT-PCR FMD Serotyping');
      setStatus(lr.status || 'positive');
      setPathogen(lr.pathogenConfirmed ?? (lr as any).pathogen ?? '');
      setSerotype(lr.serotype ?? '');
      setCtValue(lr.ctValue !== undefined ? String(lr.ctValue) : '');
      setConfirmedDisease(lr.confirmedDisease ?? 'FMD');
      setNotes(lr.notes ?? '');
      setIsSaved(true);
      setSaveError(null);
    } else {
      setTestName('RT-PCR FMD Serotyping');
      setStatus('positive');
      setPathogen('');
      setSerotype('');
      setCtValue('');
      setConfirmedDisease('FMD');
      setNotes('');
      setIsSaved(false);
      setSaveError(null);
    }
  }, [selectedCase?.id]);

  // ----------------------------------------------------------------
  // Derived case lists — no memo needed; these are cheap filters
  // Active:    has sampleCollection, case status not yet finalised
  // Completed: lab result already entered (labResult present)
  // ----------------------------------------------------------------
  const activeCases = cases.filter(
    c =>
      c.sampleCollection &&
      c.incidentReport.status !== 'confirmed' &&
      c.incidentReport.status !== 'result_negative'
  );

  const completedCases = cases.filter(c => c.labResult != null);

  const displayedCases = activeTab === 'active' ? activeCases : completedCases;

  // Handle tab switch: if the currently selected case is not in the
  // new tab's list, deselect gracefully (prevents stale workspace).
  function handleTabSwitch(tab: 'active' | 'completed') {
    setActiveTab(tab);
    const targetList = tab === 'active' ? activeCases : completedCases;
    const stillPresent = selectedCase && targetList.some(c => c.id === selectedCase.id);
    if (!stillPresent) {
      setSelectedCase(targetList.length > 0 ? targetList[0] : null);
      setIsSaved(false);
      setSaveError(null);
    }
  }

  const sc = selectedCase?.sampleCollection;

  // ----------------------------------------------------------------
  // Determine the current chain step for this sample
  // ----------------------------------------------------------------
  function getCurrentStep(chainOfCustody: { step: string }[]): ChainStep {
    const steps = chainOfCustody.map(s => s.step);
    const reversed = [...CHAIN_STEPS].reverse();
    for (const s of reversed) {
      if (steps.includes(s)) return s;
    }
    return 'Collected';
  }

  // ----------------------------------------------------------------
  // Advance chain of custody step
  // ----------------------------------------------------------------
  async function handleAdvanceStep() {
    if (!sc || !selectedCase) return;
    const current = getCurrentStep(sc.chainOfCustody ?? []);
    const currentIdx = CHAIN_STEPS.indexOf(current);
    if (currentIdx >= CHAIN_STEPS.length - 1) return; // already at Testing

    const nextStep = CHAIN_STEPS[currentIdx + 1];
    setAdvancingStep(true);
    try {
      await updateSample(sc.id, nextStep, 'u-lab-01', `Step advanced to ${nextStep}`);
      // Optimistically update local state
      setCases(prev => prev.map(c => {
        if (c.id !== selectedCase.id || !c.sampleCollection) return c;
        return {
          ...c,
          sampleCollection: {
            ...c.sampleCollection,
            chainOfCustody: [
              ...(c.sampleCollection.chainOfCustody ?? []),
              { step: nextStep, timestamp: new Date().toISOString(), handledBy: 'u-lab-01', notes: `Step advanced to ${nextStep}` },
            ],
          },
        };
      }));
      setSelectedCase(prev => {
        if (!prev || !prev.sampleCollection) return prev;
        return {
          ...prev,
          sampleCollection: {
            ...prev.sampleCollection,
            chainOfCustody: [
              ...(prev.sampleCollection.chainOfCustody ?? []),
              { step: nextStep, timestamp: new Date().toISOString(), handledBy: 'u-lab-01', notes: `Step advanced to ${nextStep}` },
            ],
          },
        };
      });
    } catch {
      // silently fail in demo mode
    } finally {
      setAdvancingStep(false);
    }
  }

  // ----------------------------------------------------------------
  // Submit lab result
  // ----------------------------------------------------------------
  async function handleSaveResult(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCase || !sc) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await submitLabResult({
        sampleId: sc.id,
        caseId: selectedCase.id,
        labUserId: 'u-lab-01',
        testName,
        status,
        pathogenConfirmed: status === 'positive' ? pathogen : undefined,
        serotype: status === 'positive' ? serotype : undefined,
        confirmedDisease: status === 'positive' ? confirmedDisease : undefined,
        ctValue: ctValue ? parseFloat(ctValue) : undefined,
        notes,
        completedAt: new Date().toISOString(),
      });

      // Update the main cases array so Active → Completed transition is instant
      const newStatus =
        result.status === 'positive' ? 'confirmed' : 'result_negative';

      setCases(prev =>
        prev.map(c => {
          if (c.id !== selectedCase.id) return c;
          return {
            ...c,
            labResult: result,
            incidentReport: { ...c.incidentReport, status: newStatus },
          };
        })
      );

      // Keep selectedCase in sync (workspace stays visible after tab re-derives)
      setSelectedCase(prev =>
        prev
          ? {
              ...prev,
              labResult: result,
              incidentReport: { ...prev.incidentReport, status: newStatus },
            }
          : prev
      );

      // Auto-fire critical alert on positive result
      if (status === 'positive') {
        const alertTitle = `POSITIVE LAB RESULT — ${confirmedDisease} Confirmed`;
        const alertMsg = `${testName} result: POSITIVE. Pathogen: ${pathogen}${serotype ? ` (${serotype})` : ''}${ctValue ? `, Ct=${ctValue}` : ''}. Case: ${selectedCase.id}.`;

        await createAlert({
          alertType: 'POSITIVE_LAB_RESULT',
          caseId: selectedCase.id,
          severity: 'critical',
          title: alertTitle,
          message: alertMsg,
          targetRoles: ['gov_officer', 'veterinarian', 'paravet'],
          targetDistrict: selectedCase.incidentReport.location.district,
          actionPath: `/cases/${selectedCase.id}`,
          actionLabel: 'View Case',
        });

        addNotification({
          severity: 'critical',
          title: alertTitle,
          message: alertMsg,
          caseId: selectedCase.id,
          targetRoles: ['gov_officer', 'veterinarian', 'paravet', 'lab_tech', 'admin'],
          actionPath: `/cases/${selectedCase.id}`,
          actionLabel: 'View Case',
        });
      }

      setIsSaved(true);
    } catch (err) {
      setSaveError('Failed to save lab result. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title text-xl">
            <FlaskConical size={22} className="text-amber-700" />
            Laboratory Tracking &amp; Chain of Custody
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Sample Verification · Cold Chain Tracking · Confirmatory Diagnostic Entry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-pending">Lab Technician Portal</span>
          <span className="synthetic-watermark">Synthetic Data</span>
        </div>
      </div>

      {/* Loading state */}
      {loadingCases && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          Loading samples…
        </div>
      )}

      {!loadingCases && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Sample List — tabbed */}
          <div className="space-y-3">

            {/* Tab buttons */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-600">
              <button
                onClick={() => handleTabSwitch('active')}
                className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 transition-colors ${
                  activeTab === 'active'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                Active Cases
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-700 ${
                  activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {activeCases.length}
                </span>
              </button>
              <button
                onClick={() => handleTabSwitch('completed')}
                className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 transition-colors border-l border-gray-200 ${
                  activeTab === 'completed'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                Completed
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-700 ${
                  activeTab === 'completed' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {completedCases.length}
                </span>
              </button>
            </div>

            {/* Empty state per tab */}
            {displayedCases.length === 0 && (
              <div className="card p-4 text-sm text-gray-400 text-center">
                {activeTab === 'active'
                  ? 'No active samples pending a result.'
                  : 'No completed lab results yet.'}
              </div>
            )}

            {/* Case cards */}
            {displayedCases.map(c => {
              const isSelected = c.id === selectedCase?.id;
              const sample = c.sampleCollection ?? null;
              return (
                <div
                  key={c.id}
                  onClick={() => { setSelectedCase(c); setIsSaved(false); setSaveError(null); }}
                  className={`card p-4 cursor-pointer transition-all ${
                    isSelected ? 'border-amber-600 ring-2 ring-amber-600/20 bg-amber-50/20' : 'hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      {sample && (
                        <span className="font-mono text-xs font-700 text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                          {sample.barcode}
                        </span>
                      )}
                      <h3 className="font-700 text-sm text-gray-900 mt-1 capitalize">
                        {c.incidentReport.species} ({c.incidentReport.location.village})
                      </h3>
                    </div>
                    {c.labResult ? (
                      <Badge variant={c.labResult.status} size="sm" />
                    ) : (
                      <Badge variant="pending" label="In Transit" size="sm" />
                    )}
                  </div>

                  {sample && (
                    <>
                      <p className="text-xs text-gray-500 mt-2">
                        Sample: {sample.sampleType}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Destination: {sample.destinationLab ?? sample.destinationLabName}
                      </p>
                    </>
                  )}
                  {c.labResult && (
                    <p className="text-xs text-green-700 font-600 mt-1.5 capitalize">
                      Result: {c.labResult.status}{c.labResult.confirmedDisease ? ` — ${c.labResult.confirmedDisease}` : ''}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                    {c.id}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Main Tracking & Diagnostic Workspace */}
          <div className="lg:col-span-2 space-y-6">

            {/* Chain of Custody Timeline */}
            {sc ? (
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-2">
                  <div>
                    <span className="font-mono text-xs text-gray-400">Barcode: {sc.barcode}</span>
                    <h2 className="text-base font-800 text-gray-900">
                      Chain of Custody Tracking
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200 font-600">
                    <Check size={14} /> Cold Chain Validated (2°C – 8°C)
                  </div>
                </div>

                {/* Chain steps grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CHAIN_STEPS.map((step, idx) => {
                    const chainSteps = sc.chainOfCustody ?? [];
                    const completed = chainSteps.some(s => s.step === step);
                    const stepRecord = chainSteps.find(s => s.step === step);
                    const icons = [QrCode, Truck, FlaskConical, CheckCircle2];
                    const Icon = icons[idx];
                    return (
                      <div
                        key={step}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          completed
                            ? 'bg-green-50 border-green-300'
                            : 'bg-gray-50 border-gray-200 opacity-50'
                        }`}
                      >
                        <Icon size={16} className={`mx-auto mb-1 ${completed ? 'text-green-600' : 'text-gray-400'}`} />
                        <p className="text-[11px] font-700 text-gray-700">{step}</p>
                        {stepRecord && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {format(new Date(stepRecord.timestamp), 'dd MMM HH:mm')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Advance step button */}
                {(() => {
                  const current = getCurrentStep(sc.chainOfCustody ?? []);
                  const currentIdx = CHAIN_STEPS.indexOf(current);
                  if (currentIdx < CHAIN_STEPS.length - 1) {
                    const next = CHAIN_STEPS[currentIdx + 1];
                    return (
                      <button
                        onClick={handleAdvanceStep}
                        disabled={advancingStep}
                        className="btn btn-sm btn-secondary gap-1.5 text-xs"
                      >
                        {advancingStep
                          ? <Loader2 size={13} className="animate-spin" />
                          : <ChevronRight size={13} />
                        }
                        Advance to "{next}"
                      </button>
                    );
                  }
                  return (
                    <p className="text-xs text-green-700 font-600 flex items-center gap-1">
                      <CheckCircle2 size={14} /> All chain steps completed — sample in Testing
                    </p>
                  );
                })()}
              </div>
            ) : (
              <div className="card p-6 text-center text-gray-400 text-sm">
                Select a case with a sample to view chain of custody.
              </div>
            )}

            {/* Diagnostic Result Entry Form */}
            {selectedCase && (
              <form onSubmit={handleSaveResult} className="card p-5 space-y-5">
                <h2 className="text-sm font-700 text-amber-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <FlaskConical size={16} />
                  Laboratory Diagnostic Result Entry
                </h2>

                {/* Success banner */}
                {isSaved && (
                  <div className="alert-banner success">
                    <CheckCircle2 size={18} />
                    <div>
                      <strong>Lab Result Recorded &amp; Verified!</strong>
                      <p className="text-xs">
                        Case status updated.
                        {status === 'positive' && ' Critical alert dispatched to District Officers and Vets.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Error banner */}
                {saveError && (
                  <div className="alert-banner danger flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {saveError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label text-xs">Diagnostic Assay / Test Name</label>
                    <select
                      value={testName}
                      onChange={e => setTestName(e.target.value)}
                      className="form-select"
                    >
                      <option value="RT-PCR FMD Serotyping">RT-PCR FMD Serotyping</option>
                      <option value="ELISA Antibody Detection">ELISA Antibody Detection</option>
                      <option value="Bacterial Culture &amp; Isolation">Bacterial Culture &amp; Isolation</option>
                      <option value="PCR Lumpy Skin Virus">PCR Lumpy Skin Virus</option>
                      <option value="PCR PPR">PCR PPR</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-xs">Result Outcome</label>
                    <select
                      value={status}
                      onChange={e => { setStatus(e.target.value as LabResultStatus); setIsSaved(false); }}
                      className="form-select"
                    >
                      <option value="positive">POSITIVE (Pathogen Confirmed)</option>
                      <option value="negative">NEGATIVE (Clear)</option>
                      <option value="inconclusive">INCONCLUSIVE (Retest)</option>
                    </select>
                  </div>
                </div>

                {/* Positive-specific fields */}
                {status === 'positive' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
                    <div>
                      <label className="form-label text-xs text-red-900">Identified Pathogen</label>
                      <input
                        type="text"
                        value={pathogen}
                        onChange={e => setPathogen(e.target.value)}
                        className="form-input"
                        placeholder="e.g. FMDV"
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs text-red-900">Serotype / Strain</label>
                      <input
                        type="text"
                        value={serotype}
                        onChange={e => setSerotype(e.target.value)}
                        className="form-input"
                        placeholder="e.g. Type O"
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs text-red-900">Confirmed Disease</label>
                      <select
                        value={confirmedDisease}
                        onChange={e => setConfirmedDisease(e.target.value as SuspectedDisease)}
                        className="form-select"
                      >
                        <option value="FMD">FMD (Foot and Mouth)</option>
                        <option value="LSD">LSD (Lumpy Skin)</option>
                        <option value="PPR">PPR (Peste des Petits)</option>
                        <option value="BQ">BQ (Black Quarter)</option>
                        <option value="Anthrax">Anthrax</option>
                        <option value="Rabies">Rabies</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Ct Value + Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label text-xs">
                      Ct Value {status !== 'positive' && <span className="text-gray-400">(optional)</span>}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      value={ctValue}
                      onChange={e => setCtValue(e.target.value)}
                      className="form-input"
                      placeholder="e.g. 18.4"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">PCR cycle threshold (lower = higher load)</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label text-xs">Technical Notes</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="form-textarea"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {status === 'positive' && (
                    <p className="text-xs text-red-700 font-600 flex items-center gap-1">
                      <AlertTriangle size={14} />
                      Positive result will trigger critical district alert
                    </p>
                  )}
                  <div className="ml-auto">
                    <button
                      type="submit"
                      disabled={isSaving || isSaved}
                      className="btn btn-primary bg-amber-600 hover:bg-amber-700 disabled:opacity-60"
                    >
                      {isSaving
                        ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                        : <><CheckCircle2 size={16} /> Confirm &amp; Submit Official Lab Result</>
                      }
                    </button>
                  </div>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
