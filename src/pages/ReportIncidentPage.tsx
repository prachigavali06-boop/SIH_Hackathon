// ============================================================
// ReportIncidentPage — Farmer / Para-vet Incident Reporting Form
// Features instant AI triage preview & offline queueing
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, MapPin, Check, Send, Brain, Info
} from 'lucide-react';
import { SYMPTOM_CATALOG } from '../data/seed';
import type { AnimalSpecies, TriageResult, RiskBand, SuspectedDisease } from '../types';
import { AIExplanationPanel } from '../components/ui/AIExplanationPanel';

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

export function ReportIncidentPage() {
  const navigate = useNavigate();

  // Form State
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
  const [block, setBlock] = useState('Niphad');
  const [district, setDistrict] = useState('Nashik');
  const [stateName, setStateName] = useState('Maharashtra');
  const [gpsCaptured, setGpsCaptured] = useState(false);
  const [lat, setLat] = useState<number>(20.0059);
  const [lng, setLng] = useState<number>(73.7930);

  // Vaccination State
  const [isVaccinated, setIsVaccinated] = useState<boolean>(false);
  const [vaccineNames, setVaccineNames] = useState<string>('');

  // Submission / Preview State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState('');
  const [triagePreview, setTriagePreview] = useState<TriageResult | null>(null);

  // Category filter for symptoms UI
  const [symptomCategory, setSymptomCategory] = useState<string>('all');

  // Compute instantaneous AI Triage Preview whenever relevant inputs change
  useEffect(() => {
    if (selectedSymptoms.length === 0) {
      setTriagePreview(null);
      return;
    }

    // Rule-based Mock AI Engine logic
    let score = 20; // base score
    let suspected: SuspectedDisease = 'unknown';

    // Symptom checks
    const hasVesiclesMouth = selectedSymptoms.includes('vesicles_mouth');
    const hasVesiclesFeet = selectedSymptoms.includes('vesicles_feet');
    const hasNodules = selectedSymptoms.includes('skin_nodules');
    const hasDiarrhea = selectedSymptoms.includes('diarrhea') || selectedSymptoms.includes('bloody_diarrhea');
    const hasCough = selectedSymptoms.includes('cough') || selectedSymptoms.includes('dyspnea');

    if ((hasVesiclesMouth || hasVesiclesFeet) && (species === 'cattle' || species === 'buffalo' || species === 'pig')) {
      score += 45;
      suspected = 'FMD';
    } else if (hasNodules && (species === 'cattle' || species === 'buffalo')) {
      score += 35;
      suspected = 'LSD';
    } else if (hasDiarrhea && (species === 'sheep' || species === 'goat')) {
      score += 40;
      suspected = 'PPR';
    } else if (hasCough && (species === 'cattle' || species === 'buffalo')) {
      score += 30;
      suspected = 'HS';
    } else if (deadAnimals > 0) {
      score += 35;
      suspected = 'BQ';
    }

    if (affectedAnimals / totalAnimals > 0.5) score += 15;
    if (deadAnimals > 0) score += 15;
    if (!isVaccinated) score += 10;

    score = Math.min(Math.max(score, 15), 95);

    let riskBand: RiskBand = 'low';
    if (score >= 75) riskBand = 'high';
    else if (score >= 45) riskBand = 'moderate';

    const factors = [
      {
        label: 'Symptom Match Rate',
        value: `${selectedSymptoms.length} reported symptoms`,
        weight: 35,
        direction: 'risk' as const,
      },
      {
        label: 'Herd Attack Rate',
        value: `${affectedAnimals} of ${totalAnimals} affected (${Math.round((affectedAnimals/totalAnimals)*100)}%)`,
        weight: 20,
        direction: 'risk' as const,
      },
      {
        label: 'Vaccination Status',
        value: isVaccinated ? 'Vaccinated (protective)' : 'Unvaccinated (+10% risk)',
        weight: isVaccinated ? 15 : 15,
        direction: isVaccinated ? ('protective' as const) : ('risk' as const),
      },
    ];

    if (deadAnimals > 0) {
      factors.push({
        label: 'Mortality Reported',
        value: `${deadAnimals} death(s)`,
        weight: 20,
        direction: 'risk' as const,
      });
    }

    setTriagePreview({
      incidentId: 'preview',
      computedAt: new Date().toISOString(),
      riskScore: score,
      riskBand,
      suspectedDisease: suspected,
      factors,
      recommendation: riskBand === 'high'
        ? 'High risk detected. Veterinary escalation & sample collection strongly advised.'
        : 'Moderate risk. Monitor herd closely and schedule veterinary visit.',
      disclaimer: 'This is an AI-assisted risk assessment based on reported symptoms. It is NOT a definitive diagnosis. Veterinary confirmation is mandatory.',
      modelVersion: 'sentinel-triage-mock-v1.0',
      isSynthetic: true,
    });
  }, [species, totalAnimals, affectedAnimals, deadAnimals, selectedSymptoms, isVaccinated]);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setGpsCaptured(true);
        },
        () => {
          alert('GPS permission denied or unavailable. Using default location.');
          setGpsCaptured(true);
        }
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const newId = `ir-${Math.floor(100 + Math.random() * 900)}`;
      setCreatedCaseId(newId);
      setIsSubmitting(false);
      setSubmitSuccess(true);
    }, 800);
  };

  const filteredSymptoms = symptomCategory === 'all'
    ? SYMPTOM_CATALOG
    : SYMPTOM_CATALOG.filter(s => s.category === symptomCategory);

  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 page-enter">
        <div className="card p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
            <Check size={32} />
          </div>
          <h2 className="text-2xl font-800 text-gray-900">Incident Reported Successfully!</h2>
          <p className="text-sm text-gray-600">
            Case Reference ID: <strong className="font-mono text-green-700">{createdCaseId}</strong>
          </p>
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs text-amber-900 space-y-1">
            <p className="font-700">Next Steps in Closed-Loop Workflow:</p>
            <p>1. Incident queued for assigned block Veterinarian (Dr. Anand Deshmukh).</p>
            <p>2. High risk triage alert sent to District Health Officer.</p>
            <p>3. Para-vet Sunita Patil alerted for field visit.</p>
          </div>
          <div className="flex justify-center gap-3 pt-4">
            <button className="btn btn-secondary" onClick={() => navigate('/cases')}>
              View All Cases
            </button>
            <button className="btn btn-primary" onClick={() => {
              setSubmitSuccess(false);
              setSelectedSymptoms([]);
            }}>
              Report Another Incident
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title text-xl">
            <FileText size={22} className="text-green-700" />
            Report Animal Disease Incident
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Quick field report for Farmers & Para-veterinarians · Multilingual & Low-Bandwidth Ready
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">

          {/* Step 1: Species & Count */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-700 text-gray-800 uppercase tracking-wider text-green-800 border-b pb-2">
              1. Species & Herd Information / पशु और झुंड जानकारी
            </h2>

            {/* Species Selector Grid */}
            <div>
              <label className="form-label">Select Animal Species / पशु का प्रकार</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SPECIES_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSpecies(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center justify-center gap-1 ${
                      species === opt.id
                        ? 'border-green-600 bg-green-50 text-green-800 ring-2 ring-green-600/20 font-600'
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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="form-label text-xs">Total Herd Size</label>
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
                <label className="form-label text-xs text-amber-700">Affected Count</label>
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
                <label className="form-label text-xs text-red-700">Dead Animals</label>
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

          {/* Step 2: Symptoms Checklist */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
              <h2 className="text-sm font-700 text-gray-800 uppercase tracking-wider text-green-800">
                2. Observed Symptoms / देखे गए लक्षण ({selectedSymptoms.length} selected)
              </h2>
              <div className="flex gap-1">
                {['all', 'general', 'skin', 'digestive', 'respiratory'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSymptomCategory(cat)}
                    className={`px-2 py-0.5 text-xs rounded-full capitalize ${
                      symptomCategory === cat ? 'bg-green-700 text-white font-600' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {cat}
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
                        ? 'border-green-600 bg-green-50 text-green-900 font-600'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                    }`}
                  >
                    <span>{sym.label}</span>
                    {isSelected && <Check size={14} className="text-green-600 flex-shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            {/* Onset & Duration */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="form-label text-xs">Onset Date</label>
                <input
                  type="date"
                  value={onsetDate}
                  onChange={e => setOnsetDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label text-xs">Duration (Days)</label>
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

          {/* Step 3: Location & Vaccination */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-700 text-gray-800 uppercase tracking-wider text-green-800 border-b pb-2">
              3. Location & History / स्थान व टीकाकरण
            </h2>

            {/* GPS capture button */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-green-700" />
                <div>
                  <p className="text-xs font-700 text-green-900">
                    {gpsCaptured ? `GPS Fixed: ${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Capture Exact GPS Coordinates'}
                  </p>
                  <p className="text-[10px] text-green-700">Crucial for Spatial Cluster Analysis</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                className="btn btn-sm btn-primary"
              >
                {gpsCaptured ? 'Recapture GPS' : 'Get Location'}
              </button>
            </div>

            {/* Location fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="form-label text-xs">Village / गाँव</label>
                <input
                  type="text"
                  value={village}
                  onChange={e => setVillage(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label text-xs">Block / ब्लॉक</label>
                <input
                  type="text"
                  value={block}
                  onChange={e => setBlock(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label text-xs">District / जिला</label>
                <input
                  type="text"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label text-xs">State / राज्य</label>
                <input
                  type="text"
                  value={stateName}
                  onChange={e => setStateName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* Vaccination status */}
            <div className="pt-2">
              <label className="form-label text-xs">Is the herd vaccinated? / क्या टीकाकरण हुआ है?</label>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="vaccinated"
                    checked={isVaccinated}
                    onChange={() => setIsVaccinated(true)}
                    className="accent-green-600"
                  />
                  Yes / हाँ
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="vaccinated"
                    checked={!isVaccinated}
                    onChange={() => setIsVaccinated(false)}
                    className="accent-green-600"
                  />
                  No / नहीं
                </label>
              </div>

              {isVaccinated && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Vaccine names (e.g. FMD Oil Adjuvant, Lumpivax)"
                    value={vaccineNames}
                    onChange={e => setVaccineNames(e.target.value)}
                    className="form-input"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="form-label text-xs">Additional Notes / विवरण</label>
              <textarea
                value={additionalNotes}
                onChange={e => setAdditionalNotes(e.target.value)}
                placeholder="Describe any other signs, recent animal purchasing, or nearby cases…"
                className="form-textarea"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/cases')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedSymptoms.length === 0}
              className="btn btn-primary btn-lg"
            >
              <Send size={18} />
              {isSubmitting ? 'Submitting Incident…' : 'Submit Field Report'}
            </button>
          </div>
        </form>

        {/* Right Sidebar: Realtime AI Triage Preview */}
        <div className="space-y-4">
          <div className="sticky top-20">
            <div className="section-header mb-2">
              <h3 className="section-title text-sm">
                <Brain size={16} className="text-purple-600" />
                Live AI Triage Preview
              </h3>
              <span className="synthetic-watermark">Mock Model</span>
            </div>

            {triagePreview ? (
              <AIExplanationPanel triage={triagePreview} />
            ) : (
              <div className="card p-6 text-center text-gray-400 space-y-2">
                <Info size={24} className="mx-auto text-gray-300" />
                <p className="text-xs">
                  Select at least one symptom to generate instant explainable AI risk scoring preview.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
