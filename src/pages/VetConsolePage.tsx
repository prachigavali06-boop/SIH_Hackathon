// ============================================================
// VetConsolePage — Module 3: Veterinarian & Field Worker Workflow
// Structured Field Investigation, Clinical Observations,
// Sample Collection, Vaccination/Treatment Records & Escalations
// ============================================================

import { useState, useEffect } from 'react';
import {
  Stethoscope, CheckCircle2, ShieldCheck, FlaskConical, AlertTriangle,
  RefreshCw, Wifi, WifiOff, Camera, Syringe, Pill, ArrowUpRight,
  History, Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { getCases, recordFieldVisit, createSample, recordAnimalVaccination, recordTreatment, escalateCasePriority, closeCase, syncOfflineQueueToApi } from '../services/api';
import { getUnsyncedOfflineItems } from '../services/offlineQueue';
import { SYNTHETIC_CASES, DISEASE_INFO, SYMPTOM_CATALOG } from '../data/seed';
import type { CaseRecord, SuspectedDisease, RiskBand } from '../types';
import { Badge } from '../components/ui/Badge';
import { AIExplanationPanel } from '../components/ui/AIExplanationPanel';
import { CaseTimeline } from '../components/ui/CaseTimeline';
import { useAuthStore } from '../store/authStore';

const SAMPLE_TYPES = [
  'Epithelial Tissue & Vesicular Fluid',
  'Whole Blood (EDTA)',
  'Blood Serum',
  'Nasal Swab',
  'Fecal Swab / Milk Sample',
  'Organ Tissue Sample',
];

const DESTINATION_LABS = [
  'NRFMD Regional Diagnostic Lab (Mukteswar)',
  'IVRI National Referral Lab (Bareilly)',
  'State Veterinary Biological Institute (Pune)',
  'District Disease Diagnostic Laboratory (Nashik)',
];

const SYNDROME_CATEGORIES = [
  { id: 'vesicular', label: 'Vesicular Lesions Pattern (FMD suspected)' },
  { id: 'hemorrhagic', label: 'Hemorrhagic / Sudden Death Pattern (HS / Anthrax / BQ)' },
  { id: 'respiratory', label: 'Acute Respiratory Distress (PPR / CCPP)' },
  { id: 'nodular', label: 'Nodular Cutaneous Disease (LSD)' },
  { id: 'reproductive', label: 'Abortion / Reproductive Failure (Brucellosis)' },
  { id: 'undifferentiated', label: 'Undifferentiated Febrile Illness' },
];

export function VetConsolePage() {
  const { currentUser } = useAuthStore();
  const isAuthorized = currentUser?.role === 'veterinarian' || currentUser?.role === 'field_worker' || currentUser?.role === 'paravet' || currentUser?.role === 'admin';

  const [cases, setCases] = useState<CaseRecord[]>(SYNTHETIC_CASES);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(SYNTHETIC_CASES[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'field_visit' | 'sample' | 'health_history' | 'treatment' | 'escalation' | 'timeline'>('field_visit');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<RiskBand | 'all'>('all');
  const [testScenario, setTestScenario] = useState<'all' | 'empty' | 'single' | 'critical' | 'sample_pending' | 'lab_result' | 'closed'>('all');

  // Offline Queue State
  const [unsyncedCount, setUnsyncedCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Field Visit Form State
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['fever', 'vesicles_mouth', 'drooling']);
  const [clinicalObs, setClinicalObs] = useState('Epithelial sloughing observed on tongue and dental pad. Temperature 104.2°F. Profuse ropy salivation.');
  const [tempCelsius, setTempCelsius] = useState<number>(40.1);
  const [affectedCount, setAffectedCount] = useState<number>(8);
  const [mortalityCount, setMortalityCount] = useState<number>(1);
  const [vaccinationVerified, setVaccinationVerified] = useState<boolean>(false);
  const [vaccinationDetails, setVaccinationDetails] = useState('No official vaccination stamp in herd register.');
  const [treatmentHistory, setTreatmentHistory] = useState('Farmer administered local oral antiseptic application 24h prior.');
  const [suspectedSyndrome, setSuspectedSyndrome] = useState('vesicular');
  const [agreedWithAi, setAgreedWithAi] = useState(true);
  const [revisedRisk, setRevisedRisk] = useState<RiskBand>('high');
  const [clinicalDiagnosis, setClinicalDiagnosis] = useState<SuspectedDisease>('FMD');
  const [sampleRequired, setSampleRequired] = useState(true);
  const [quarantineRecommended, setQuarantineRecommended] = useState(true);
  const [priority, setPriority] = useState<RiskBand>('high');
  const [fieldNotes, setFieldNotes] = useState('Immediate vector control & movement isolation recommended for 3km radius.');
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1546445317-29f4545f9d52?w=400&auto=format&fit=crop&q=60',
  ]);
  const [formSubmittedMsg, setFormSubmittedMsg] = useState<string | null>(null);

  // Sample Form State
  const [animalId, setAnimalId] = useState('TAG-MH-2026-8801');
  const [sampleType, setSampleType] = useState(SAMPLE_TYPES[0]);
  const [destinationLab, setDestinationLab] = useState(DESTINATION_LABS[0]);
  const [transportStatus, setTransportStatus] = useState<'collected' | 'in_transit' | 'dispatched'>('collected');

  // Vaccination Form State
  const [vaccineName, setVaccineName] = useState('FMD-TriVac (O, A, Asia1)');
  const [batchNo, setBatchNo] = useState('BATCH-2026-FMD-991');
  const [nextDueDate, setNextDueDate] = useState('2027-02-28');

  // Treatment Form State
  const [medicationName, setMedicationName] = useState('Oxytetracycline LA + Antiseptic Mouth Wash');
  const [dosage, setDosage] = useState('20 ml I/M single dose + Daily oral wash');
  const [instructions, setInstructions] = useState('Isolate affected animal in shaded stall. Provide soft wet feed.');

  // Escalation State
  const [escalateReason, setEscalateReason] = useState('Multiple animals showing severe vesicles. Rapid spread within 48 hours.');

  // Load cases and check offline queue
  useEffect(() => {
    fetchCasesData();

    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const fetchCasesData = async () => {
    const list = await getCases();
    setCases(list);
    const unsynced = await getUnsyncedOfflineItems();
    setUnsyncedCount(unsynced.length);
  };

  const selectedCase = cases.find(c => c.id === selectedCaseId) || cases[0];

  // Sync selected case initial values when selection changes
  useEffect(() => {
    if (selectedCase) {
      const ir = selectedCase.incidentReport;
      const va = selectedCase.vetAssessment;
      setAffectedCount(ir.affectedAnimals);
      setMortalityCount(ir.deadAnimals);
      setSelectedSymptoms(ir.symptomIds || []);
      if (va) {
        setClinicalObs(va.clinicalFindings || '');
        setAgreedWithAi(va.agreedWithAiRisk);
        setSampleRequired(va.requiresSample);
        setQuarantineRecommended(va.quarantineRecommended);
        if (va.photos) setAttachedPhotos(va.photos);
        if (va.notes) setFieldNotes(va.notes);
        if (va.treatmentHistory) setTreatmentHistory(va.treatmentHistory);
      }
    }
  }, [selectedCaseId]);

  // Handle Offline Sync
  const handleSyncNow = async () => {
    setIsSyncing(true);
    await syncOfflineQueueToApi();
    await fetchCasesData();
    setIsSyncing(false);
  };

  // Scenario Switcher Helper
  const handleScenarioChange = (scenario: typeof testScenario) => {
    setTestScenario(scenario);
    if (scenario === 'empty') {
      setSelectedCaseId('');
    } else if (scenario === 'single') {
      setSelectedCaseId(SYNTHETIC_CASES[0].id);
    } else if (scenario === 'critical') {
      const crit = SYNTHETIC_CASES.find(c => c.triageResult?.riskBand === 'critical' || c.triageResult?.riskBand === 'high') || SYNTHETIC_CASES[0];
      setSelectedCaseId(crit.id);
    } else if (scenario === 'sample_pending') {
      const smp = SYNTHETIC_CASES.find(c => c.incidentReport.status === 'sample_collected' || c.incidentReport.status === 'sample_dispatched') || SYNTHETIC_CASES[0];
      setSelectedCaseId(smp.id);
    } else if (scenario === 'lab_result') {
      const lab = SYNTHETIC_CASES.find(c => c.labResult) || SYNTHETIC_CASES[0];
      setSelectedCaseId(lab.id);
    } else if (scenario === 'closed') {
      const closed = SYNTHETIC_CASES.find(c => c.incidentReport.status === 'closed') || SYNTHETIC_CASES[0];
      setSelectedCaseId(closed.id);
    } else {
      setSelectedCaseId(SYNTHETIC_CASES[0].id);
    }
  };

  // Save Field Visit Form
  const handleSaveFieldVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    await recordFieldVisit({
      caseId: selectedCase.id,
      visitedByUserId: currentUser?.id || 'u-vet-01',
      visitorRole: currentUser?.role || 'veterinarian',
      visitedAt: new Date().toISOString(),
      clinicalObservations: clinicalObs,
      temperatureCelsius: tempCelsius,
      observedSymptoms: selectedSymptoms,
      affectedCount,
      mortality: mortalityCount,
      vaccinationVerified,
      vaccinationDetails,
      treatmentHistory,
      suspectedSyndrome,
      priority,
      agreedWithAiRisk: agreedWithAi,
      revisedRiskBand: agreedWithAi ? selectedCase.triageResult?.riskBand : revisedRisk,
      clinicalDiagnosis,
      quarantineRecommended,
      sampleRequired,
      notes: fieldNotes,
      photos: attachedPhotos,
    });

    setFormSubmittedMsg('✅ Field Visit & Clinical Observations successfully saved!');
    setTimeout(() => setFormSubmittedMsg(null), 4000);
    await fetchCasesData();
  };

  // Create Sample Form
  const handleSaveSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    await createSample({
      caseId: selectedCase.id,
      animalId,
      sampleType,
      collectedByUserId: currentUser?.name || 'Sunita Patil (Field Worker)',
      collectedAt: new Date().toISOString(),
      animalCountSampled: 1,
      destinationLabName: destinationLab,
      transportStatus,
    });

    setFormSubmittedMsg('🧪 Sample Record & Chain of Custody successfully registered!');
    setTimeout(() => setFormSubmittedMsg(null), 4000);
    await fetchCasesData();
  };

  // Save Vaccination Update
  const handleSaveVaccination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    await recordAnimalVaccination({
      caseId: selectedCase.id,
      species: selectedCase.incidentReport.species,
      vaccineName,
      batchNumber: batchNo,
      administeredByUserId: currentUser?.name || 'Dr. Anand Deshmukh',
      administeredAt: new Date().toISOString().split('T')[0],
      nextDueDate,
    });

    setFormSubmittedMsg('💉 Vaccination record added & herd status updated!');
    setTimeout(() => setFormSubmittedMsg(null), 4000);
    await fetchCasesData();
  };

  // Save Treatment Record
  const handleSaveTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    await recordTreatment({
      caseId: selectedCase.id,
      prescribedByVetId: currentUser?.name || 'Dr. Anand Deshmukh',
      medicationName,
      dosage,
      instructions,
      administeredAt: new Date().toISOString(),
    });

    setFormSubmittedMsg('💊 Supportive treatment prescribed & logged!');
    setTimeout(() => setFormSubmittedMsg(null), 4000);
    await fetchCasesData();
  };

  // Escalate Priority
  const handleEscalatePriority = async (newBand: RiskBand) => {
    if (!selectedCase) return;
    await escalateCasePriority(
      selectedCase.id,
      newBand,
      currentUser?.id || 'u-vet-01',
      currentUser?.role || 'veterinarian',
      escalateReason
    );
    setFormSubmittedMsg(`⚠️ Case priority updated to ${newBand.toUpperCase()}`);
    setTimeout(() => setFormSubmittedMsg(null), 4000);
    await fetchCasesData();
  };

  // Close Case
  const handleCloseCase = async () => {
    if (!selectedCase) return;
    await closeCase(
      selectedCase.id,
      currentUser?.id || 'u-vet-01',
      currentUser?.role || 'veterinarian',
      'Clinical symptoms resolved, quarantine duration complete, laboratory negative/contained.'
    );
    setFormSubmittedMsg('🔒 Case officially Closed & Contained.');
    setTimeout(() => setFormSubmittedMsg(null), 4000);
    await fetchCasesData();
  };

  // Attach sample photo simulator
  const handleAddSamplePhoto = () => {
    const samplePhotos = [
      'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60',
    ];
    const newPhoto = samplePhotos[attachedPhotos.length % samplePhotos.length];
    setAttachedPhotos([...attachedPhotos, newPhoto]);
  };

  // Filter cases for display
  const displayCases = testScenario === 'empty' ? [] : cases.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      c.id.toLowerCase().includes(q) ||
      c.incidentReport.species.toLowerCase().includes(q) ||
      (c.incidentReport.location.village?.toLowerCase().includes(q) ?? false) ||
      c.incidentReport.location.district.toLowerCase().includes(q);
    const matchPriority = priorityFilter === 'all' || c.triageResult?.riskBand === priorityFilter;
    return matchSearch && matchPriority;
  });

  return (
    <div className="space-y-6 page-enter pb-10">
      {/* Header */}
      <div className="section-header flex-wrap gap-3">
        <div>
          <h1 className="section-title text-xl flex items-center gap-2">
            <Stethoscope size={24} className="text-purple-700" />
            Veterinary & Field Worker Console
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Human-in-the-Loop Investigation · Structured Field Visits & Sample Management
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Connection / Offline Queue Indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 border ${
            isOnline ? 'bg-green-50 text-green-800 border-green-200' : 'bg-amber-50 text-amber-900 border-amber-300'
          }`}>
            {isOnline ? <Wifi size={14} className="text-green-600" /> : <WifiOff size={14} className="text-amber-600" />}
            <span>{isOnline ? 'Online' : 'Offline Mode Active'}</span>
            {unsyncedCount > 0 && (
              <span className="ml-1 bg-amber-600 text-white px-1.5 py-0.5 rounded-full font-bold text-[10px]">
                {unsyncedCount} Queued
              </span>
            )}
          </div>

          {unsyncedCount > 0 && (
            <button
              onClick={handleSyncNow}
              disabled={isSyncing || !isOnline}
              className="btn btn-sm btn-primary bg-amber-600 hover:bg-amber-700 text-white gap-1"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync Offline Queue'}
            </button>
          )}

          <span className="badge badge-suspected">Member 3 Workspace</span>
        </div>
      </div>

      {/* Role Permission Safety Banner */}
      {!isAuthorized ? (
        <div className="alert-banner warning p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-900 flex items-start gap-3 rounded-lg">
          <Lock size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <strong className="text-sm font-700">Privileged Clinical Access Restricted</strong>
            <p className="mt-1">
              You are currently logged in as a <strong>Farmer</strong>. Farmers can view basic report status, but cannot record clinical observations, submit sample collections, log treatments, or change operational priority. Switch to a <strong>Veterinarian</strong> or <strong>Field Worker</strong> account in the top bar to test active workflows.
            </p>
          </div>
        </div>
      ) : (
        <div className="alert-banner info p-3 bg-purple-50 border-l-4 border-purple-600 text-purple-950 flex items-center justify-between gap-3 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-purple-700 flex-shrink-0" />
            <span>
              <strong>Domain Safety Compliance:</strong> AI outputs provide diagnostic assistance only. Definitive field diagnosis and sample ordering are executed solely by authorized clinical personnel.
            </span>
          </div>
          <span className="synthetic-watermark">Synthetic Data</span>
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-3 border-l-4 border-purple-600">
          <p className="text-xs font-600 text-gray-500 uppercase">Assigned Cases</p>
          <p className="text-xl font-800 text-gray-900 mt-0.5">{cases.length}</p>
        </div>
        <div className="card p-3 border-l-4 border-amber-500">
          <p className="text-xs font-600 text-gray-500 uppercase">Field Visits Needed</p>
          <p className="text-xl font-800 text-amber-700 mt-0.5">
            {cases.filter(c => c.incidentReport.status === 'triaged' || c.incidentReport.status === 'vet_assigned').length}
          </p>
        </div>
        <div className="card p-3 border-l-4 border-blue-500">
          <p className="text-xs font-600 text-gray-500 uppercase">Samples Dispatched</p>
          <p className="text-xl font-800 text-blue-700 mt-0.5">
            {cases.filter(c => c.sampleCollection).length}
          </p>
        </div>
        <div className="card p-3 border-l-4 border-red-600">
          <p className="text-xs font-600 text-gray-500 uppercase">Critical Escalations</p>
          <p className="text-xl font-800 text-red-600 mt-0.5">
            {cases.filter(c => c.triageResult?.riskBand === 'critical' || c.triageResult?.riskBand === 'high').length}
          </p>
        </div>
      </div>

      {/* Test Scenarios Quick Bar */}
      <div className="card p-3 bg-slate-900 text-white flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-700 text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <FlaskConical size={14} className="text-purple-400" />
          Test Scenario Presets:
        </span>
        <div className="flex gap-1.5 flex-wrap text-xs">
          {[
            { id: 'all', label: 'All Active' },
            { id: 'empty', label: 'No Cases' },
            { id: 'single', label: 'One Active Case' },
            { id: 'critical', label: 'Critical Outbreak Case' },
            { id: 'sample_pending', label: 'Pending Sample' },
            { id: 'lab_result', label: 'Lab Result Received' },
            { id: 'closed', label: 'Case Closed' },
          ].map(sc => (
            <button
              key={sc.id}
              onClick={() => handleScenarioChange(sc.id as any)}
              className={`px-2.5 py-1 rounded font-600 transition-colors ${
                testScenario === sc.id
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Investigation Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Queue & Case Selector */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-700 text-gray-500 uppercase tracking-wider">
              Assigned Field Queue ({displayCases.length})
            </h2>
            <div className="flex items-center gap-1">
              {(['all', 'high', 'critical'] as const).map(b => (
                <button
                  key={b}
                  onClick={() => setPriorityFilter(b)}
                  className={`px-2 py-0.5 text-[11px] font-600 rounded capitalize ${
                    priorityFilter === b ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Search box */}
          <input
            type="search"
            placeholder="Search cases by ID, species, village..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input text-xs"
          />

          {/* Cases List */}
          <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
            {displayCases.length === 0 ? (
              <div className="card p-8 text-center text-gray-400 text-sm space-y-2">
                <AlertTriangle size={32} className="mx-auto text-gray-300" />
                <p className="font-600">No cases matching current filter.</p>
                <p className="text-xs">Use the scenario preset buttons above to restore cases.</p>
              </div>
            ) : (
              displayCases.map(c => {
                const isSelected = c.id === selectedCase?.id;
                const tr = c.triageResult;
                const ir = c.incidentReport;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCaseId(c.id)}
                    className={`card p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-purple-600 ring-2 ring-purple-600/20 bg-purple-50/40 shadow-sm'
                        : 'hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[11px] text-gray-400 font-600">{c.id}</span>
                        <h3 className="font-700 text-sm text-gray-900 capitalize mt-0.5">
                          {ir.species} · {ir.affectedAnimals}/{ir.totalAnimals} affected
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          📍 {ir.location.village}, {ir.location.district}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {tr && <Badge variant={tr.riskBand} size="sm" />}
                        <Badge variant={ir.status} size="sm" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-xs">
                      <span className="text-gray-400">
                        {format(new Date(ir.createdAt), 'dd MMM, HH:mm')}
                      </span>
                      <span className="font-600 text-purple-800">
                        {c.vetAssessment ? '✓ Visited' : 'Pending Visit'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Case Workspace */}
        {selectedCase ? (
          <div className="lg:col-span-2 space-y-5">

            {/* Case Details Card Header */}
            <div className="card p-5 space-y-3 bg-white">
              <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-700 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {selectedCase.id}
                    </span>
                    <Badge variant={selectedCase.incidentReport.status} />
                    {selectedCase.triageResult && <Badge variant={selectedCase.triageResult.riskBand} />}
                  </div>
                  <h2 className="text-lg font-800 text-gray-900 capitalize mt-1">
                    {selectedCase.incidentReport.species} Investigation Workspace
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Location: <strong>{selectedCase.incidentReport.location.village}</strong>, {selectedCase.incidentReport.location.block}, {selectedCase.incidentReport.location.district} · Coordinates: {selectedCase.incidentReport.location.latitude}, {selectedCase.incidentReport.location.longitude}
                  </p>
                </div>
              </div>

              {/* Status Alert Banner */}
              {formSubmittedMsg && (
                <div className="alert-banner success p-3 bg-green-50 text-green-900 border-l-4 border-green-600 rounded flex items-center gap-2 text-xs font-600">
                  <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                  <span>{formSubmittedMsg}</span>
                </div>
              )}

              {/* Action Tabs */}
              <div className="flex items-center gap-1 border-b overflow-x-auto pb-0">
                {[
                  { id: 'field_visit', label: '1. Field Visit', icon: Stethoscope },
                  { id: 'sample', label: '2. Sample Collection', icon: FlaskConical },
                  { id: 'health_history', label: '3. Health & Vaccination', icon: Syringe },
                  { id: 'treatment', label: '4. Treatment Record', icon: Pill },
                  { id: 'escalation', label: '5. Priority & Escalation', icon: ArrowUpRight },
                  { id: 'timeline', label: '6. Case Timeline', icon: History },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-700 border-b-2 whitespace-nowrap transition-colors ${
                        isActive
                          ? 'border-purple-700 text-purple-800 bg-purple-50/50'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      <Icon size={14} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TAB 1: FIELD VISIT & CLINICAL OBSERVATIONS */}
            {activeTab === 'field_visit' && (
              <form onSubmit={handleSaveFieldVisit} className="card p-5 space-y-5 bg-white">
                <h3 className="text-sm font-800 text-purple-950 uppercase tracking-wider border-b pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Stethoscope size={18} className="text-purple-700" />
                    Clinical Field Investigation Record
                  </span>
                  <span className="text-xs font-600 text-gray-400">Step 1 of Field Workflow</span>
                </h3>

                {/* AI Risk Context */}
                {selectedCase.triageResult && (
                  <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100">
                    <AIExplanationPanel triage={selectedCase.triageResult} />
                  </div>
                )}

                {/* Field Observations Form Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label text-xs font-700">Rectal Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tempCelsius}
                      onChange={e => setTempCelsius(parseFloat(e.target.value))}
                      disabled={!isAuthorized}
                      className="form-input text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label text-xs font-700">Suspected Clinical Syndrome</label>
                    <select
                      value={suspectedSyndrome}
                      onChange={e => setSuspectedSyndrome(e.target.value)}
                      disabled={!isAuthorized}
                      className="form-select text-xs"
                    >
                      {SYNDROME_CATEGORIES.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-xs font-700">Verified Affected Count</label>
                    <input
                      type="number"
                      value={affectedCount}
                      onChange={e => setAffectedCount(parseInt(e.target.value) || 0)}
                      disabled={!isAuthorized}
                      className="form-input text-xs"
                    />
                  </div>

                  <div>
                    <label className="form-label text-xs font-700">Verified Mortality Count</label>
                    <input
                      type="number"
                      value={mortalityCount}
                      onChange={e => setMortalityCount(parseInt(e.target.value) || 0)}
                      disabled={!isAuthorized}
                      className="form-input text-xs text-red-600 font-bold"
                    />
                  </div>
                </div>

                {/* Observed Symptoms Checklist */}
                <div>
                  <label className="form-label text-xs font-700 mb-2">Observed Clinical Symptoms (Field Verification)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg border">
                    {SYMPTOM_CATALOG.slice(0, 12).map(s => {
                      const isChecked = selectedSymptoms.includes(s.id);
                      return (
                        <label key={s.id} className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!isAuthorized}
                            onChange={e => {
                              if (e.target.checked) setSelectedSymptoms([...selectedSymptoms, s.id]);
                              else setSelectedSymptoms(selectedSymptoms.filter(id => id !== s.id));
                            }}
                            className="accent-purple-600 rounded"
                          />
                          <span>{s.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Physical Clinical Observations */}
                <div>
                  <label className="form-label text-xs font-700">Detailed Clinical Findings & Lesion Description</label>
                  <textarea
                    rows={3}
                    value={clinicalObs}
                    onChange={e => setClinicalObs(e.target.value)}
                    disabled={!isAuthorized}
                    placeholder="Enter physical examination details, vesicles appearance, lameness, mucosal erosion..."
                    className="form-textarea text-xs"
                    required
                  />
                </div>

                {/* Vaccination Verification */}
                <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
                  <label className="flex items-center gap-2 text-xs font-700 text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vaccinationVerified}
                      disabled={!isAuthorized}
                      onChange={e => setVaccinationVerified(e.target.checked)}
                      className="accent-purple-600 rounded"
                    />
                    <span>Vaccination Verification Completed (Inspected Animal Passport / Herd Log)</span>
                  </label>
                  <input
                    type="text"
                    value={vaccinationDetails}
                    onChange={e => setVaccinationDetails(e.target.value)}
                    disabled={!isAuthorized}
                    placeholder="Vaccination verification notes..."
                    className="form-input text-xs"
                  />
                </div>

                {/* Treatment & Past History */}
                <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
                  <label className="form-label text-xs font-700">Prior Animal Treatment History</label>
                  <input
                    type="text"
                    value={treatmentHistory}
                    onChange={e => setTreatmentHistory(e.target.value)}
                    disabled={!isAuthorized}
                    placeholder="Prior treatments administered by farmer/paravet..."
                    className="form-input text-xs"
                  />
                </div>

                {/* Photos Attachment Simulator */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="form-label text-xs font-700 flex items-center gap-1.5">
                      <Camera size={14} className="text-purple-700" />
                      Field Photo Attachments ({attachedPhotos.length})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddSamplePhoto}
                      disabled={!isAuthorized}
                      className="btn btn-xs btn-secondary text-purple-700"
                    >
                      + Attach Clinical Photo
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {attachedPhotos.map((url, idx) => (
                      <div key={idx} className="relative w-24 h-20 rounded-lg overflow-hidden border bg-gray-100 flex-shrink-0 group">
                        <img src={url} alt={`Lesion photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5">
                          Photo {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Field Triage Agreement & Decision */}
                <div className="pt-3 border-t space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label text-xs font-700">Clinical Opinion / Primary Suspicion</label>
                      <select
                        value={clinicalDiagnosis}
                        onChange={e => setClinicalDiagnosis(e.target.value as SuspectedDisease)}
                        disabled={!isAuthorized}
                        className="form-select text-xs"
                      >
                        {Object.entries(DISEASE_INFO).map(([key, info]) => (
                          <option key={key} value={key}>{info.name} ({key})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label text-xs font-700">AI Triage Agreement & Risk Revision</label>
                      <div className="flex items-center gap-2 mt-1">
                        <label className="flex items-center gap-1.5 text-xs text-gray-800 cursor-pointer">
                          <input
                            type="radio"
                            name="aiAgree"
                            checked={agreedWithAi}
                            onChange={() => setAgreedWithAi(true)}
                            className="accent-purple-600"
                          />
                          Agree with AI
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-gray-800 cursor-pointer">
                          <input
                            type="radio"
                            name="aiAgree"
                            checked={!agreedWithAi}
                            onChange={() => setAgreedWithAi(false)}
                            className="accent-purple-600"
                          />
                          Revise Risk
                        </label>
                      </div>
                      {!agreedWithAi && (
                        <select
                          value={revisedRisk}
                          onChange={e => setRevisedRisk(e.target.value as RiskBand)}
                          className="form-select text-xs mt-1"
                        >
                          <option value="low">Low Risk</option>
                          <option value="moderate">Moderate Risk</option>
                          <option value="high">High Risk</option>
                          <option value="critical">Critical Risk</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="form-label text-xs font-700">Veterinary Officer Field Notes & Containment Instructions</label>
                    <textarea
                      rows={2}
                      value={fieldNotes}
                      onChange={e => setFieldNotes(e.target.value)}
                      disabled={!isAuthorized}
                      placeholder="General field notes..."
                      className="form-textarea text-xs"
                    />
                  </div>

                  <div>
                    <label className="form-label text-xs font-700">Operational Priority Level</label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as RiskBand)}
                      disabled={!isAuthorized}
                      className="form-select text-xs font-bold"
                    >
                      <option value="low">LOW — Monitor Local Herd</option>
                      <option value="moderate">MODERATE — Veterinary Review</option>
                      <option value="high">HIGH — Priority Field Visit</option>
                      <option value="critical">CRITICAL — District Escalation</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 text-xs font-700 text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sampleRequired}
                        disabled={!isAuthorized}
                        onChange={e => setSampleRequired(e.target.checked)}
                        className="accent-purple-600 rounded"
                      />
                      <span className="flex items-center gap-1">
                        <FlaskConical size={14} className="text-amber-600" />
                        Laboratory Sample Collection Required
                      </span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-700 text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quarantineRecommended}
                        disabled={!isAuthorized}
                        onChange={e => setQuarantineRecommended(e.target.checked)}
                        className="accent-purple-600 rounded"
                      />
                      <span className="text-red-700">
                        Recommend Herd Isolation & Movement Restriction
                      </span>
                    </label>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex justify-end pt-2 border-t">
                  <button
                    type="submit"
                    disabled={!isAuthorized}
                    className="btn btn-primary bg-purple-700 hover:bg-purple-800 text-white text-xs gap-1.5"
                  >
                    <CheckCircle2 size={16} />
                    Save Field Visit & Clinical Observations
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: SAMPLE COLLECTION */}
            {activeTab === 'sample' && (
              <form onSubmit={handleSaveSample} className="card p-5 space-y-5 bg-white">
                <h3 className="text-sm font-800 text-purple-950 uppercase tracking-wider border-b pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FlaskConical size={18} className="text-amber-600" />
                    Diagnostic Sample Collection & Dispatch
                  </span>
                  <span className="text-xs font-600 text-gray-400">Step 2 of Field Workflow</span>
                </h3>

                {/* Existing Sample Card if already collected */}
                {selectedCase.sampleCollection && (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-700 text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                        Barcode: {selectedCase.sampleCollection.barcode}
                      </span>
                      <Badge variant="contained" label={selectedCase.sampleCollection.transportStatus || 'Collected'} />
                    </div>
                    <p className="text-xs text-amber-900">
                      Sample Type: <strong>{selectedCase.sampleCollection.sampleType}</strong> · Destination: <strong>{selectedCase.sampleCollection.destinationLabName}</strong>
                    </p>
                    <div className="text-[11px] text-amber-700 font-mono">
                      Collected at: {format(new Date(selectedCase.sampleCollection.collectedAt), 'dd MMM yyyy, HH:mm')}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label text-xs font-700">Animal Tag / ID Number</label>
                    <input
                      type="text"
                      value={animalId}
                      onChange={e => setAnimalId(e.target.value)}
                      disabled={!isAuthorized}
                      className="form-input text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label text-xs font-700">Sample Type</label>
                    <select
                      value={sampleType}
                      onChange={e => setSampleType(e.target.value)}
                      disabled={!isAuthorized}
                      className="form-select text-xs"
                    >
                      {SAMPLE_TYPES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-xs font-700">Destination Laboratory</label>
                    <select
                      value={destinationLab}
                      onChange={e => setDestinationLab(e.target.value)}
                      disabled={!isAuthorized}
                      className="form-select text-xs"
                    >
                      {DESTINATION_LABS.map(lab => (
                        <option key={lab} value={lab}>{lab}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-xs font-700">Transport & Cold Chain Status</label>
                    <select
                      value={transportStatus}
                      onChange={e => setTransportStatus(e.target.value as any)}
                      disabled={!isAuthorized}
                      className="form-select text-xs"
                    >
                      <option value="collected">Collected in Cold Box (2-8°C)</option>
                      <option value="in_transit">In Transit (Dispatch Carrier)</option>
                      <option value="dispatched">Dispatched to Laboratory</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border text-xs text-gray-600 flex items-center justify-between">
                  <div>
                    <strong>Generated Canonical Barcode:</strong>
                    <span className="font-mono text-purple-700 font-bold ml-2">
                      SNT-{selectedCase.id.replace(/[^0-9]/g, '')}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400">M1 & M4 Standard Compliant</span>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <button
                    type="submit"
                    disabled={!isAuthorized}
                    className="btn btn-primary bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
                  >
                    <FlaskConical size={15} />
                    Register Sample & Dispatch to Lab
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: HEALTH & VACCINATION HISTORY */}
            {activeTab === 'health_history' && (
              <div className="card p-5 space-y-5 bg-white">
                <h3 className="text-sm font-800 text-purple-950 uppercase tracking-wider border-b pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Syringe size={18} className="text-blue-600" />
                    Animal & Herd Vaccination History
                  </span>
                  <span className="text-xs font-600 text-gray-400">Health History Log</span>
                </h3>

                {/* Existing Vaccination Records */}
                <div>
                  <h4 className="text-xs font-700 text-gray-500 uppercase mb-2">Vaccination Log</h4>
                  {selectedCase.vaccinationRecords && selectedCase.vaccinationRecords.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCase.vaccinationRecords.map((v, i) => (
                        <div key={i} className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-700 text-blue-900">{v.vaccineName}</p>
                            <p className="text-gray-500">Batch: {v.batchNumber || 'N/A'} · Administered: {v.administeredAt}</p>
                          </div>
                          <span className="text-green-700 font-600">✓ Active Immunity</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded">
                      No prior digital vaccination records found for this herd.
                    </p>
                  )}
                </div>

                {/* Record New Vaccination Form */}
                <form onSubmit={handleSaveVaccination} className="space-y-3 pt-3 border-t">
                  <h4 className="text-xs font-700 text-gray-700 uppercase">Log Vaccination Update</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="form-label text-xs">Vaccine Brand / Target</label>
                      <input
                        type="text"
                        value={vaccineName}
                        onChange={e => setVaccineName(e.target.value)}
                        disabled={!isAuthorized}
                        className="form-input text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Batch Number</label>
                      <input
                        type="text"
                        value={batchNo}
                        onChange={e => setBatchNo(e.target.value)}
                        disabled={!isAuthorized}
                        className="form-input text-xs font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Next Booster Due</label>
                      <input
                        type="date"
                        value={nextDueDate}
                        onChange={e => setNextDueDate(e.target.value)}
                        disabled={!isAuthorized}
                        className="form-input text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={!isAuthorized}
                      className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                    >
                      <Syringe size={14} />
                      Log Vaccination Record
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 4: TREATMENT RECORD */}
            {activeTab === 'treatment' && (
              <div className="card p-5 space-y-5 bg-white">
                <h3 className="text-sm font-800 text-purple-950 uppercase tracking-wider border-b pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Pill size={18} className="text-emerald-600" />
                    Veterinary Treatment Prescriptions
                  </span>
                  <span className="text-xs font-600 text-gray-400">Supportive Care Log</span>
                </h3>

                {/* Existing Treatment Records */}
                <div>
                  <h4 className="text-xs font-700 text-gray-500 uppercase mb-2">Prescribed Treatments</h4>
                  {selectedCase.treatmentRecords && selectedCase.treatmentRecords.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCase.treatmentRecords.map((tx, i) => (
                        <div key={i} className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 text-xs space-y-1">
                          <div className="flex justify-between font-700 text-emerald-900">
                            <span>{tx.medicationName}</span>
                            <span className="text-gray-400 font-normal">{format(new Date(tx.administeredAt), 'dd MMM, HH:mm')}</span>
                          </div>
                          <p className="text-gray-600">Dosage: {tx.dosage}</p>
                          {tx.instructions && <p className="text-emerald-800 font-500">{tx.instructions}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded">
                      No treatments prescribed yet.
                    </p>
                  )}
                </div>

                {/* Prescribe Treatment Form */}
                <form onSubmit={handleSaveTreatment} className="space-y-3 pt-3 border-t">
                  <h4 className="text-xs font-700 text-gray-700 uppercase">Prescribe New Medication</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="form-label text-xs">Medication / Antibiotic / Antiseptic</label>
                      <input
                        type="text"
                        value={medicationName}
                        onChange={e => setMedicationName(e.target.value)}
                        disabled={!isAuthorized}
                        className="form-input text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Dosage & Frequency</label>
                      <input
                        type="text"
                        value={dosage}
                        onChange={e => setDosage(e.target.value)}
                        disabled={!isAuthorized}
                        className="form-input text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label text-xs">Special Administration Instructions</label>
                    <textarea
                      rows={2}
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                      disabled={!isAuthorized}
                      className="form-textarea text-xs"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={!isAuthorized}
                      className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                    >
                      <Pill size={14} />
                      Prescribe & Save Treatment
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 5: PRIORITY & ESCALATION */}
            {activeTab === 'escalation' && (
              <div className="card p-5 space-y-5 bg-white">
                <h3 className="text-sm font-800 text-purple-950 uppercase tracking-wider border-b pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ArrowUpRight size={18} className="text-red-600" />
                    Operational Priority & Escalation Rules
                  </span>
                  <span className="text-xs font-600 text-gray-400">Response Triggering</span>
                </h3>

                <p className="text-xs text-gray-500">
                  Select an operational priority level to trigger appropriate response actions across district veterinary authorities. These reflect operational urgencies, not automated disease diagnoses.
                </p>

                {/* Priority Levels Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { band: 'low', title: 'LOW — Monitor Local Herd', desc: 'Symptom localized, non-spreading. Regular farmer monitoring advised.', color: 'border-green-500 bg-green-50/30' },
                    { band: 'moderate', title: 'MODERATE — Veterinary Review', desc: 'Multiple symptoms reported. Assigned vet review scheduled within 24h.', color: 'border-amber-500 bg-amber-50/30' },
                    { band: 'high', title: 'HIGH — Priority Field Visit', desc: 'High morbidity or mortality. Rapid field investigation & sample collection required.', color: 'border-red-500 bg-red-50/30' },
                    { band: 'critical', title: 'CRITICAL — District Escalation', desc: 'Potential outbreak cluster. Alert state authorities & initiate quarantine protocol.', color: 'border-red-800 bg-red-100/40' },
                  ].map(p => {
                    const isCurrent = selectedCase.triageResult?.riskBand === p.band;
                    return (
                      <div
                        key={p.band}
                        className={`p-3 rounded-lg border-2 space-y-1 transition-all ${p.color} ${
                          isCurrent ? 'ring-2 ring-purple-600 font-bold' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-800 capitalize">{p.title}</span>
                          {isCurrent && <span className="text-[10px] bg-purple-700 text-white px-2 py-0.5 rounded">Active Priority</span>}
                        </div>
                        <p className="text-[11px] text-gray-600 leading-snug">{p.desc}</p>
                        <button
                          type="button"
                          disabled={!isAuthorized || isCurrent}
                          onClick={() => handleEscalatePriority(p.band as RiskBand)}
                          className="btn btn-xs btn-secondary mt-2 w-full text-[11px]"
                        >
                          Set Priority to {p.band.toUpperCase()}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Escalation Notes */}
                <div>
                  <label className="form-label text-xs font-700">Escalation Rationale / Justification Notes</label>
                  <textarea
                    rows={2}
                    value={escalateReason}
                    onChange={e => setEscalateReason(e.target.value)}
                    disabled={!isAuthorized}
                    className="form-textarea text-xs"
                  />
                </div>

                {/* Close Case Button */}
                <div className="pt-4 border-t flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    <strong>Case Lifecycle Status:</strong> {selectedCase.incidentReport.status.toUpperCase()}
                  </div>
                  <button
                    type="button"
                    disabled={!isAuthorized || selectedCase.incidentReport.status === 'closed'}
                    onClick={handleCloseCase}
                    className="btn btn-sm btn-secondary text-gray-800 hover:bg-gray-200 border-gray-300 font-700"
                  >
                    🔒 Close & Archive Case
                  </button>
                </div>
              </div>
            )}

            {/* TAB 6: CASE TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="card p-5 space-y-4 bg-white">
                <h3 className="text-sm font-800 text-purple-950 uppercase tracking-wider border-b pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <History size={18} className="text-gray-700" />
                    Complete Case Audit Timeline
                  </span>
                  <span className="text-xs font-600 text-gray-400">Canonical Lifecycle</span>
                </h3>

                <CaseTimeline events={selectedCase.timeline} />
              </div>
            )}

          </div>
        ) : (
          <div className="lg:col-span-2 card p-12 text-center text-gray-400 text-sm">
            Select a case from the queue to view workspace.
          </div>
        )}

      </div>
    </div>
  );
}
