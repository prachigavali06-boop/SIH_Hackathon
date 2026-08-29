// ============================================================
// ReportIncidentPage — Farmer & Field Worker Multimodal Reporting
// Member 2 — Multimodal Field Evidence, Offline Sync & AI Triage
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, MapPin, Check, Send, Brain, Info, WifiOff,
  AlertTriangle, ShieldAlert, Phone, UserCheck, Sparkles, Languages
} from 'lucide-react';
import { SYMPTOM_CATALOG, SYNTHETIC_CASES } from '../data/seed';
import type { AnimalSpecies, TriageResult, GeoLocation, CaseRecord } from '../types';
import { AIExplanationPanel } from '../components/ui/AIExplanationPanel';
import { VoiceRecorder } from '../components/ui/VoiceRecorder';
import { ImageUploader, type UploadedImage } from '../components/ui/ImageUploader';
import { RiskEngine } from '../services/aiRiskEngine';
import { createCase, getCases } from '../services/api';
import { addEvidence } from '../services/platform';
import { saveOfflineIncident } from '../services/offlineQueue';
import { useAuthStore } from '../store/authStore';

const SPECIES_OPTIONS: { id: AnimalSpecies; label: string; emoji: string; labelHi: string }[] = [
  { id: 'cattle',  label: 'Cattle (Cow/Ox)', emoji: '🐄', labelHi: 'गाय / बैल' },
  { id: 'buffalo', label: 'Buffalo',         emoji: '🐃', labelHi: 'भैंस' },
  { id: 'goat',    label: 'Goat',            emoji: '🐐', labelHi: 'बकरी' },
  { id: 'sheep',   label: 'Sheep',           emoji: '🐑', labelHi: 'भेड़' },
  { id: 'pig',     label: 'Pig',             emoji: '🐷', labelHi: 'सूअर' },
  { id: 'poultry', label: 'Poultry',         emoji: '🐔', labelHi: 'मुर्गी' },
  { id: 'equine',  label: 'Horse/Mule',      emoji: '🐴', labelHi: 'घोड़ा' },
  { id: 'other',   label: 'Other',           emoji: '🐾', labelHi: 'अन्य' },
];

const SYMPTOM_CATEGORIES: { id: string; labelEn: string; labelHi: string }[] = [
  { id: 'all',         labelEn: 'All',         labelHi: 'सभी' },
  { id: 'general',     labelEn: 'General',     labelHi: 'सामान्य' },
  { id: 'skin',        labelEn: 'Skin',        labelHi: 'त्वचा' },
  { id: 'digestive',   labelEn: 'Digestive',   labelHi: 'पाचन' },
  { id: 'respiratory', labelEn: 'Respiratory', labelHi: 'श्वसन' },
];

export function ReportIncidentPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();

  // Language state
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const isHi = lang === 'hi';

  // Network state
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Form State: Herd Information
  const [species, setSpecies] = useState<AnimalSpecies>('cattle');
  const [totalAnimals, setTotalAnimals] = useState<number>(10);
  const [affectedAnimals, setAffectedAnimals] = useState<number>(3);
  const [deadAnimals, setDeadAnimals] = useState<number>(0);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['fever', 'vesicles_mouth']);
  const [onsetDate, setOnsetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [durationDays, setDurationDays] = useState<number>(2);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  // Location State
  const [village, setVillage] = useState('Chandori');
  const [gramPanchayat, setGramPanchayat] = useState('Chandori GP');
  const [block, setBlock] = useState('Niphad');
  const [district, setDistrict] = useState('Nashik');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pincode, setPincode] = useState('422201');
  const [gpsCaptured, setGpsCaptured] = useState(false);
  const [lat, setLat] = useState<number>(20.0059);
  const [lng, setLng] = useState<number>(73.7930);

  // Vaccination State
  const [isVaccinated, setIsVaccinated] = useState<boolean>(false);
  const [vaccineNames, setVaccineNames] = useState<string>('');

  // Multimodal Evidence State
  const [voiceData, setVoiceData] = useState<{
    audioBlob: Blob | null;
    audioUrl: string | null;
    transcript: string;
  } | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  // Submission & Preview State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState('');
  const [wasOfflineSubmitted, setWasOfflineSubmitted] = useState(false);
  const [triagePreview, setTriagePreview] = useState<TriageResult | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isLikelyDuplicate: boolean;
    matchingCaseId?: string;
    reasons: string[];
  } | null>(null);
  const [acknowledgedDuplicate, setAcknowledgedDuplicate] = useState(false);

  // Dynamic cases cache for duplicate detection (fallback to SYNTHETIC_CASES)
  const [currentCases, setCurrentCases] = useState<CaseRecord[]>(SYNTHETIC_CASES);

  // Load current cases on mount
  const refreshCases = async () => {
    try {
      const fetched = await getCases();
      if (fetched && fetched.length > 0) {
        setCurrentCases(fetched);
      } else {
        setCurrentCases(SYNTHETIC_CASES);
      }
    } catch (err) {
      console.warn('Failed to load cases for duplicate detection, using fallback:', err);
      setCurrentCases(SYNTHETIC_CASES);
    }
  };

  useEffect(() => {
    refreshCases();
  }, []);

  // Category filter for symptoms UI
  const [symptomCategory, setSymptomCategory] = useState<string>('all');

  // Compute live AI Triage Preview & Check Duplicates via centralized RiskEngine
  useEffect(() => {
    if (selectedSymptoms.length === 0) {
      setTriagePreview(null);
      setDuplicateWarning(null);
      return;
    }

    const location: GeoLocation = {
      latitude: lat,
      longitude: lng,
      village,
      gramPanchayat,
      block,
      district,
      state: stateName,
      pincode,
    };

    // Synthesize multimodal evidences for engine evaluation
    const evidencesList: any[] = [];
    if (voiceData?.transcript) {
      evidencesList.push({
        id: 'temp-voice',
        caseId: 'preview',
        type: 'VOICE',
        source: 'farmer_app',
        transcript: voiceData.transcript,
        createdAt: new Date().toISOString(),
      });
    }
    if (uploadedImages.length > 0) {
      uploadedImages.forEach((img) => {
        evidencesList.push({
          id: img.id,
          caseId: 'preview',
          type: 'IMAGE',
          source: 'farmer_app',
          metadata: img.metadata,
          createdAt: new Date().toISOString(),
        });
      });
    }

    const input = {
      species,
      totalAnimals,
      affectedAnimals,
      deadAnimals,
      symptomIds: selectedSymptoms,
      isVaccinated,
      vaccineNames,
      additionalNotes,
      location,
      evidences: evidencesList,
    };

    // 1. Live Triage
    const assessment = RiskEngine.assess(input);
    setTriagePreview({
      ...assessment,
      incidentId: 'preview',
    });

    // 2. Duplicate Detection against dynamically loaded cases
    const dupCheck = RiskEngine.detectDuplicateReports(input, currentCases);
    if (dupCheck.isLikelyDuplicate && !acknowledgedDuplicate) {
      setDuplicateWarning(dupCheck);
    } else {
      setDuplicateWarning(null);
    }
  }, [
    species, totalAnimals, affectedAnimals, deadAnimals, selectedSymptoms,
    isVaccinated, vaccineNames, lat, lng, village, gramPanchayat, block,
    district, stateName, pincode, additionalNotes, voiceData, uploadedImages,
    acknowledgedDuplicate, currentCases
  ]);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(Number(pos.coords.latitude.toFixed(6)));
          setLng(Number(pos.coords.longitude.toFixed(6)));
          setGpsCaptured(true);
        },
        () => {
          alert(
            isHi
              ? 'जीपीएस अनुमति उपलब्ध नहीं है। डिफ़ॉल्ट स्थान का उपयोग किया जा रहा है।'
              : 'GPS permission denied or unavailable. Using default coordinates.'
          );
          setGpsCaptured(true);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSymptoms.length === 0) return;

    setIsSubmitting(true);
    const userId = currentUser?.id || 'u-farmer-01';
    const role = currentUser?.role || 'farmer';

    const location: GeoLocation = {
      latitude: lat,
      longitude: lng,
      village,
      gramPanchayat,
      block,
      district,
      state: stateName,
      pincode,
    };

    // Prepare evidence payload
    const evidencesToAttach: Array<{
      type: 'TEXT' | 'VOICE' | 'IMAGE';
      source: string;
      uri?: string;
      transcript?: string;
      metadata?: Record<string, any>;
    }> = [];

    if (additionalNotes) {
      evidencesToAttach.push({
        type: 'TEXT',
        source: 'farmer_app',
        transcript: additionalNotes,
      });
    }

    if (voiceData?.audioUrl || voiceData?.transcript) {
      evidencesToAttach.push({
        type: 'VOICE',
        source: 'farmer_voice_memo',
        uri: voiceData.audioUrl || undefined,
        transcript: voiceData.transcript,
        metadata: { durationSeconds: 15 },
      });
    }

    for (const img of uploadedImages) {
      evidencesToAttach.push({
        type: 'IMAGE',
        source: 'farmer_mobile_cam',
        uri: img.dataUrl,
        metadata: img.metadata,
      });
    }

    try {
      if (isOnline) {
        // Online workflow: createCase -> attach all evidences
        const { caseId, record } = await createCase({
          reportedByUserId: userId,
          reporterRole: role,
          primarySpecies: species,
          totalAnimalsInHerd: totalAnimals,
          affectedAnimalCount: affectedAnimals,
          deadAnimalCount: deadAnimals,
          symptomIds: selectedSymptoms,
          onsetDate,
          durationDays,
          additionalNotes,
          latitude: lat,
          longitude: lng,
          village,
          block,
          district,
          state: stateName,
          isVaccinated,
          vaccineNames,
        });

        // Attach evidences via platform contract
        for (const ev of evidencesToAttach) {
          await addEvidence({
            caseId,
            type: ev.type,
            source: ev.source,
            uri: ev.uri,
            transcript: ev.transcript,
            metadata: ev.metadata,
          });
        }

        // Update currentCases in component state so subsequent reports detect this newly created case
        if (record) {
          setCurrentCases(prev => [record, ...prev]);
        }

        setCreatedCaseId(caseId);
        setWasOfflineSubmitted(false);
      } else {
        // Offline workflow: save locally in IndexedDB
        const offlineReport = await saveOfflineIncident({
          reportedByUserId: userId,
          reporterRole: role,
          primarySpecies: species,
          totalAnimalsInHerd: totalAnimals,
          affectedAnimalCount: affectedAnimals,
          deadAnimalCount: deadAnimals,
          symptomIds: selectedSymptoms,
          onsetDate,
          durationDays,
          additionalNotes,
          location,
          isVaccinated,
          vaccineNames,
          evidences: evidencesToAttach,
        });

        setCreatedCaseId(offlineReport.canonicalCaseId);
        setWasOfflineSubmitted(true);
      }

      setSubmitSuccess(true);
    } catch (err) {
      console.error('Incident report submission failed:', err);
      alert(
        isHi
          ? 'रिपोर्ट सबमिट करने में विफल। पुनः प्रयास करें।'
          : 'Failed to submit incident report. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSymptoms = symptomCategory === 'all'
    ? SYMPTOM_CATALOG
    : SYMPTOM_CATALOG.filter(s => s.category === symptomCategory);

  // ------------------------------------------------------------
  // Post-Submission Confirmation Screen
  // ------------------------------------------------------------
  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 page-enter space-y-6">
        <div className="card p-6 sm:p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <Check size={32} />
          </div>

          <div>
            <h2 className="text-2xl font-800 text-gray-900">
              {isHi ? 'घटना सफलतापूर्वक दर्ज हुई!' : 'Incident Reported Successfully!'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isHi ? 'केस संदर्भ संख्या (Canonical ID):' : 'Official Case Reference ID:'}{' '}
              <strong className="font-mono text-emerald-700 text-base">{createdCaseId}</strong>
            </p>
          </div>

          {/* Sync Status Pill */}
          <div className="flex justify-center">
            {wasOfflineSubmitted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-700 rounded-full border border-amber-200">
                <WifiOff size={13} /> {isHi ? 'ऑफ़लाइन सहेजा गया (कनेक्शन आने पर सिंक होगा)' : 'Stored Locally (Pending Online Sync)'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-700 rounded-full border border-emerald-200">
                <Check size={13} /> {isHi ? 'जिला निगरानी प्रणाली में सिंक हो गया' : 'Synchronized to District Surveillance Ledger'}
              </span>
            )}
          </div>

          {/* Safe Non-Diagnostic Biosecurity & First-Aid Advice */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-left text-xs text-emerald-950 space-y-2">
            <p className="font-700 flex items-center gap-1.5 text-emerald-900 text-sm">
              <ShieldAlert size={16} className="text-emerald-700" />
              {isHi ? 'तुरंत सुरक्षा एवं प्राथमिक बचाव सलाह:' : 'Immediate Herd Biosecurity & First-Aid Steps:'}
            </p>
            <ul className="list-disc list-inside space-y-1 text-emerald-900/90 pl-1 leading-relaxed">
              <li>{isHi ? 'बीमार पशुओं को तुरंत स्वस्थ झुंड से अलग (आइसोलेट) करें।' : 'Isolate symptomatic animals from healthy herd immediately in a separate pen.'}</li>
              <li>{isHi ? 'पशुओं को साफ पानी और मुलायम चारा दें; मुंह में छाले होने पर खुरदुरा चारा न दें।' : 'Provide clean, lukewarm water and soft green fodder. Do not force-feed hard grain.'}</li>
              <li>{isHi ? 'पशुओं की आवाजाही या बिक्री तुरंत रोकें।' : 'Halt animal movement or village market transport to prevent disease spread.'}</li>
              <li>{isHi ? 'पशु बाड़े को चूने या अनुशंसित कीटाणुनाशक से साफ रखें।' : 'Disinfect shed entrances with lime powder or authorized farm disinfectant.'}</li>
            </ul>
          </div>

          {/* Emergency Veterinary Contacts */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-left text-xs text-blue-950 space-y-2">
            <p className="font-700 flex items-center gap-1.5 text-blue-900">
              <UserCheck size={16} className="text-blue-700" />
              {isHi ? 'असाइन किए गए स्थानीय पशु स्वास्थ्य अधिकारी:' : 'Assigned Local Animal Health Officers:'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="font-700 text-gray-800">Dr. Anand Deshmukh</p>
                  <p className="text-[10px] text-gray-500">{isHi ? 'ब्लॉक पशु चिकित्सा अधिकारी (निफाड़)' : 'Block Veterinary Officer (Niphad)'}</p>
                </div>
                <a href="tel:+919001234567" className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg">
                  <Phone size={13} />
                </a>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="font-700 text-gray-800">Sunita Patil</p>
                  <p className="text-[10px] text-gray-500">{isHi ? 'क्षेत्रीय पैरा-वेट (चांदोरी)' : 'Field Para-veterinarian (Chandori)'}</p>
                </div>
                <a href="tel:+919123456780" className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg">
                  <Phone size={13} />
                </a>
              </div>
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <button className="btn btn-secondary" onClick={() => navigate('/cases')}>
              {isHi ? 'सभी मामले देखें / View Cases' : 'View All Cases & Tracking'}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSubmitSuccess(false);
                setSelectedSymptoms(['fever']);
                setUploadedImages([]);
                setVoiceData(null);
                setAdditionalNotes('');
                setAcknowledgedDuplicate(false);
                refreshCases();
              }}
            >
              {isHi ? 'नया मामला दर्ज करें / Report Another' : 'Report Another Incident'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Main Incident Reporting Form
  // ------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter pb-12">
      {/* Header & Language Toggle */}
      <div className="section-header">
        <div>
          <h1 className="section-title text-xl flex items-center gap-2">
            <FileText size={22} className="text-emerald-700" />
            {isHi ? 'पशु रोग रिपोर्टिंग फॉर्म' : 'Report Animal Disease Incident'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isHi
              ? 'किसान और पैरा-वेट हेतु त्वरित रिपोर्टिंग · कम बैंडविड्थ और ऑफ़लाइन समर्थित'
              : 'Quick field reporting for Farmers & Para-veterinarians · Multimodal & Low-Bandwidth Ready'}
          </p>
        </div>

        {/* Bilingual Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(l => (l === 'en' ? 'hi' : 'en'))}
            className="btn btn-sm btn-secondary flex items-center gap-1.5 font-700 bg-white border-emerald-300 text-emerald-800"
            aria-label="Toggle language"
          >
            <Languages size={15} />
            <span>{isHi ? 'English' : 'हिंदी में बदलें'}</span>
          </button>
        </div>
      </div>

      {/* Duplicate Report Warning Banner */}
      {duplicateWarning && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3 shadow-sm animate-fade-in">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-amber-950 space-y-1">
            <p className="font-800 text-sm text-amber-900">
              {isHi ? 'चेतावनी: संभावित डुप्लिकेट रिपोर्ट पाई गई' : 'Notice: Potential Duplicate Incident Detected'}
            </p>
            <p>
              {isHi
                ? `इस गांव (${village}) में पिछले 48 घंटों में समान लक्षणों वाला मामला (${duplicateWarning.matchingCaseId}) पहले ही दर्ज है।`
                : `A similar case (${duplicateWarning.matchingCaseId}) was already filed nearby in ${village} with matching clinical signs.`}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAcknowledgedDuplicate(true)}
                className="btn btn-sm bg-amber-700 hover:bg-amber-800 text-white font-600 py-1"
              >
                {isHi ? 'यह अलग पशु/झुंड है (जारी रखें)' : 'This is a separate herd (Continue)'}
              </button>
              {duplicateWarning.matchingCaseId && (
                <button
                  type="button"
                  onClick={() => navigate(`/cases/${duplicateWarning.matchingCaseId}`)}
                  className="btn btn-sm btn-secondary py-1 bg-white"
                >
                  {isHi ? 'मौजूदा मामला देखें' : 'View Existing Case'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Form (2 Cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">

          {/* STEP 1: Species & Herd Size */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-700 uppercase tracking-wider text-emerald-800 border-b pb-2 flex items-center justify-between">
              <span>1. {isHi ? 'पशु और झुंड जानकारी' : 'Species & Herd Information'}</span>
              <span className="text-[10px] text-gray-400 font-normal">Step 1 of 4</span>
            </h2>

            {/* Species Selector Grid */}
            <div>
              <label className="form-label">
                {isHi ? 'पशु का प्रकार चुनें / Select Animal Species' : 'Select Animal Species'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SPECIES_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSpecies(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center justify-center gap-1 ${
                      species === opt.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20 font-700 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-xs font-600">{opt.label}</span>
                    <span className="text-[10px] text-gray-400">{opt.labelHi}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Animal Counts */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div>
                <label className="form-label text-xs">
                  {isHi ? 'कुल झुंड (संख्या)' : 'Total Herd Size'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={totalAnimals}
                  onChange={e => setTotalAnimals(Math.max(1, parseInt(e.target.value) || 1))}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label text-xs text-amber-700">
                  {isHi ? 'बीमार पशु संख्या' : 'Affected Count'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={totalAnimals}
                  value={affectedAnimals}
                  onChange={e => setAffectedAnimals(Math.min(totalAnimals, parseInt(e.target.value) || 1))}
                  className="form-input border-amber-300 focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="form-label text-xs text-red-700">
                  {isHi ? 'मृत पशु संख्या' : 'Dead Animals'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={affectedAnimals}
                  value={deadAnimals}
                  onChange={e => setDeadAnimals(Math.min(affectedAnimals, parseInt(e.target.value) || 0))}
                  className="form-input border-red-300 focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* STEP 2: Symptoms Checklist */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
              <h2 className="text-sm font-700 uppercase tracking-wider text-emerald-800">
                2. {isHi ? 'देखे गए लक्षण' : 'Observed Symptoms'} ({selectedSymptoms.length} {isHi ? 'चयनित' : 'selected'})
              </h2>
              <div className="flex gap-1 flex-wrap">
                {SYMPTOM_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSymptomCategory(cat.id)}
                    className={`px-2 py-0.5 text-xs rounded-full capitalize ${
                      symptomCategory === cat.id ? 'bg-emerald-700 text-white font-600' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isHi ? cat.labelHi : cat.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredSymptoms.map(sym => {
                const isSelected = selectedSymptoms.includes(sym.id);
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => toggleSymptom(sym.id)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-700 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                    }`}
                  >
                    <span className="leading-snug">{isHi ? (sym.labelHi || sym.label) : sym.label}</span>
                    {isSelected && <Check size={14} className="text-emerald-600 flex-shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            {/* Onset & Duration */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="form-label text-xs">
                  {isHi ? 'शुरुआत की तारीख' : 'Onset Date'}
                </label>
                <input
                  type="date"
                  value={onsetDate}
                  onChange={e => setOnsetDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label text-xs">
                  {isHi ? 'अवधि (दिन)' : 'Duration (Days)'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={durationDays}
                  onChange={e => setDurationDays(parseInt(e.target.value) || 1)}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: Multimodal Field Evidence (Voice + Image) */}
          <div className="space-y-4">
            <h2 className="text-sm font-700 uppercase tracking-wider text-emerald-800 px-1 flex items-center gap-1.5">
              <Sparkles size={16} className="text-emerald-600" />
              3. {isHi ? 'मल्टीमॉडल साक्ष्य (आवाज और फोटो)' : 'Multimodal Field Evidence (Voice & Photo)'}
            </h2>

            {/* Voice Memo */}
            <VoiceRecorder
              onRecordingComplete={(data) => setVoiceData(data)}
              onClear={() => setVoiceData(null)}
              initialTranscript={additionalNotes}
              isHindi={isHi}
            />

            {/* Lesion Photo Upload */}
            <ImageUploader
              onImagesChange={(imgs) => setUploadedImages(imgs)}
              maxImages={3}
              isHindi={isHi}
            />
          </div>

          {/* STEP 4: Location & Vaccination History */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-700 uppercase tracking-wider text-emerald-800 border-b pb-2">
              4. {isHi ? 'स्थान व टीकाकरण इतिहास' : 'Location & Vaccination History'}
            </h2>

            {/* GPS capture button */}
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-emerald-700" />
                <div>
                  <p className="text-xs font-700 text-emerald-950">
                    {gpsCaptured ? `GPS Fixed: ${lat.toFixed(4)}, ${lng.toFixed(4)}` : (isHi ? 'सटीक जीपीएस कैप्चर करें' : 'Capture Exact GPS Coordinates')}
                  </p>
                  <p className="text-[10px] text-emerald-700">
                    {isHi ? 'स्थानिक क्लस्टर विश्लेषण हेतु आवश्यक' : 'Required for spatial cluster & quarantine mapping'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                className="btn btn-sm btn-primary"
              >
                {gpsCaptured ? (isHi ? 'पुनः प्राप्त करें' : 'Recapture GPS') : (isHi ? 'स्थान लें' : 'Get Location')}
              </button>
            </div>

            {/* Location fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="form-label text-xs">{isHi ? 'गाँव' : 'Village'}</label>
                <input
                  type="text"
                  value={village}
                  onChange={e => setVillage(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label text-xs">{isHi ? 'ग्राम पंचायत' : 'Gram Panchayat'}</label>
                <input
                  type="text"
                  value={gramPanchayat}
                  onChange={e => setGramPanchayat(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label text-xs">{isHi ? 'ब्लॉक' : 'Block'}</label>
                <input
                  type="text"
                  value={block}
                  onChange={e => setBlock(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label text-xs">{isHi ? 'जिला' : 'District'}</label>
                <input
                  type="text"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label text-xs">{isHi ? 'राज्य' : 'State'}</label>
                <input
                  type="text"
                  value={stateName}
                  onChange={e => setStateName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label text-xs">{isHi ? 'पिनकोड' : 'Pincode'}</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            {/* Vaccination status */}
            <div className="pt-2">
              <label className="form-label text-xs">
                {isHi ? 'क्या पशु का हाल ही में टीकाकरण हुआ है?' : 'Is the herd vaccinated against endemic diseases?'}
              </label>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="vaccinated"
                    checked={isVaccinated}
                    onChange={() => setIsVaccinated(true)}
                    className="accent-emerald-600"
                  />
                  {isHi ? 'हाँ (टीकाकृत)' : 'Yes (Vaccinated)'}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="vaccinated"
                    checked={!isVaccinated}
                    onChange={() => setIsVaccinated(false)}
                    className="accent-emerald-600"
                  />
                  {isHi ? 'नहीं (अटीकाकृत)' : 'No (Unvaccinated)'}
                </label>
              </div>

              {isVaccinated && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder={isHi ? 'वैक्सीन का नाम (उदा. FMD Bivalent, Lumpivax)' : 'Vaccine names (e.g. FMD Oil Adjuvant, Lumpivax)'}
                    value={vaccineNames}
                    onChange={e => setVaccineNames(e.target.value)}
                    className="form-input text-xs"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="form-label text-xs">
                {isHi ? 'अतिरिक्त लिखित विवरण' : 'Additional Text Notes'}
              </label>
              <textarea
                value={additionalNotes}
                onChange={e => setAdditionalNotes(e.target.value)}
                placeholder={isHi ? 'हाल में खरीदे गए पशु, पड़ोसी गांव में बीमारी या अन्य संकेत...' : 'Describe any recent livestock purchasing, nearby cases, or feed changes…'}
                className="form-textarea text-xs"
                rows={2}
              />
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/cases')}
            >
              {isHi ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedSymptoms.length === 0}
              className="btn btn-primary btn-lg flex items-center gap-2 shadow-md"
            >
              <Send size={18} />
              {isSubmitting
                ? (isHi ? 'सबमिट हो रहा है…' : 'Submitting Incident…')
                : !isOnline
                ? (isHi ? 'ऑफ़लाइन रिपोर्ट सहेजें' : 'Save Offline Report')
                : (isHi ? 'फील्ड रिपोर्ट सबमिट करें' : 'Submit Field Report')}
            </button>
          </div>
        </form>

        {/* Right Sidebar: Realtime AI Triage Preview */}
        <div className="space-y-4">
          <div className="sticky top-20">
            <div className="section-header mb-2">
              <h3 className="section-title text-sm flex items-center gap-1.5">
                <Brain size={16} className="text-purple-600" />
                {isHi ? 'लाइव एआई ट्राइएज पूर्वावलोकन' : 'Live AI Triage Preview'}
              </h3>
              <span className="synthetic-watermark">Mock Model</span>
            </div>

            {triagePreview ? (
              <AIExplanationPanel triage={triagePreview} />
            ) : (
              <div className="card p-6 text-center text-gray-400 space-y-2">
                <Info size={24} className="mx-auto text-gray-300" />
                <p className="text-xs">
                  {isHi
                    ? 'लाइव एआई जोखिम स्कोरिंग पूर्वावलोकन हेतु कम से कम एक लक्षण चुनें।'
                    : 'Select at least one symptom to generate instant explainable AI risk scoring preview.'}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
