// ============================================================
// LabTrackerPage — Module 7: Sample Collection & Lab Tracking
// Chain of custody tracking & lab result entry
// ============================================================

import { useState } from 'react';
import { FlaskConical, CheckCircle2, QrCode, Truck, Check } from 'lucide-react';
import { format } from 'date-fns';
import { SYNTHETIC_CASES } from '../data/seed';
import type { LabResultStatus, SuspectedDisease } from '../types';
import { Badge } from '../components/ui/Badge';

export function LabTrackerPage() {
  const [selectedCase, setSelectedCase] = useState(SYNTHETIC_CASES[0]);

  // Form State
  const [testName, setTestName] = useState('RT-PCR FMD Serotyping');
  const [status, setStatus] = useState<LabResultStatus>('positive');
  const [pathogen, setPathogen] = useState('FMDV');
  const [serotype, setSerotype] = useState('Type O');
  const [notes, setNotes] = useState('High viral load detected. Ct value: 18.4.');
  const [confirmedDisease, setConfirmedDisease] = useState<SuspectedDisease>('FMD');
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveResult = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
  };

  const sc = selectedCase.sampleCollection;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title text-xl">
            <FlaskConical size={22} className="text-amber-700" />
            Laboratory Tracking & Chain of Custody
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Sample List */}
        <div className="space-y-3">
          <h2 className="text-xs font-700 text-gray-500 uppercase tracking-wider">
            Active Samples ({SYNTHETIC_CASES.filter(c => c.sampleCollection).length})
          </h2>

          {SYNTHETIC_CASES.filter(c => c.sampleCollection).map(c => {
            const isSelected = c.id === selectedCase.id;
            const sample = c.sampleCollection!;
            return (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedCase(c);
                  setIsSaved(false);
                }}
                className={`card p-4 cursor-pointer transition-all ${
                  isSelected ? 'border-amber-600 ring-2 ring-amber-600/20 bg-amber-50/20' : 'hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-700 text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      {sample.barcode}
                    </span>
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

                <p className="text-xs text-gray-500 mt-2">
                  Sample: {sample.sampleType}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Destination: {sample.destinationLab}
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
                  <Check size={14} /> Cold Chain Validated (2°C - 8°C)
                </div>
              </div>

              {/* Chain steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 text-xs font-700 text-gray-700">
                    <QrCode size={16} className="text-amber-600" /> 1. Field Collection
                  </div>
                  <p className="text-xs font-600 text-gray-900 mt-1">{sc.sampleType}</p>
                  <p className="text-[11px] text-gray-500">{sc.collectedBy}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {format(new Date(sc.collectedAt), 'dd MMM, HH:mm')}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 text-xs font-700 text-gray-700">
                    <Truck size={16} className="text-blue-600" /> 2. Transport & Dispatch
                  </div>
                  <p className="text-xs font-600 text-gray-900 mt-1">Cold Chain Vehicle</p>
                  <p className="text-[11px] text-gray-500">To {sc.destinationLab}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {sc.dispatchedAt ? format(new Date(sc.dispatchedAt), 'dd MMM, HH:mm') : 'Pending'}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 text-xs font-700 text-gray-700">
                    <FlaskConical size={16} className="text-purple-600" /> 3. Lab Intake
                  </div>
                  <p className="text-xs font-600 text-gray-900 mt-1">Integrity Verified</p>
                  <p className="text-[11px] text-gray-500">NRFMD Regional Lab</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {sc.receivedAt ? format(new Date(sc.receivedAt), 'dd MMM, HH:mm') : 'Pending'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-6 text-center text-gray-400 text-sm">
              No sample collection record associated with this case yet.
            </div>
          )}

          {/* Diagnostic Result Entry Form */}
          <form onSubmit={handleSaveResult} className="card p-5 space-y-5">
            <h2 className="text-sm font-700 text-amber-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
              <FlaskConical size={16} />
              Laboratory Diagnostic Result Entry
            </h2>

            {isSaved && (
              <div className="alert-banner success">
                <CheckCircle2 size={18} />
                <div>
                  <strong>Lab Result Recorded & Verified!</strong>
                  <p className="text-xs">State Government Health Dashboard & NADRES Stub Notification updated.</p>
                </div>
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
                  <option value="Bacterial Culture & Isolation">Bacterial Culture & Isolation</option>
                  <option value="PCR Lumpy Skin Virus">PCR Lumpy Skin Virus</option>
                </select>
              </div>

              <div>
                <label className="form-label text-xs">Result Outcome</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as LabResultStatus)}
                  className="form-select"
                >
                  <option value="positive">POSITIVE (Pathogen Confirmed)</option>
                  <option value="negative">NEGATIVE (Clear)</option>
                  <option value="inconclusive">INCONCLUSIVE (Retest)</option>
                </select>
              </div>
            </div>

            {status === 'positive' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
                <div>
                  <label className="form-label text-xs text-red-900">Identified Pathogen</label>
                  <input
                    type="text"
                    value={pathogen}
                    onChange={e => setPathogen(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label text-xs text-red-900">Serotype / Strain</label>
                  <input
                    type="text"
                    value={serotype}
                    onChange={e => setSerotype(e.target.value)}
                    className="form-input"
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
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="form-label text-xs">Technical Notes & Ct Values</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="form-textarea"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="submit" className="btn btn-primary bg-amber-600 hover:bg-amber-700">
                <CheckCircle2 size={16} />
                Confirm & Submit Official Lab Result
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
