// ============================================================
// LIVESTOCK SENTINEL — Synthetic Seed Data
// [SYNTHETIC DATA] — Not real government or animal health data
// Standardized Canonical Case ID: LV-2026-XXXXX
// ============================================================

import type {
  User, CaseRecord, DashboardStats, AppNotification,
  Symptom, SuspectedDisease, AnimalSpecies, CaseStatus, OutbreakCluster
} from '../types';

// ----------------------------------------------------------------
// DEMO USERS (one per role)
// ----------------------------------------------------------------

export const DEMO_USERS: User[] = [
  {
    id: 'u-farmer-01',
    name: 'Ramesh Kumar',
    role: 'farmer',
    district: 'Nashik',
    block: 'Niphad',
    village: 'Chandori',
    phone: '+91 9876543210',
    avatarInitials: 'RK',
  },
  {
    id: 'u-paravet-01',
    name: 'Sunita Patil',
    role: 'paravet',
    district: 'Nashik',
    block: 'Niphad',
    phone: '+91 9123456780',
    avatarInitials: 'SP',
  },
  {
    id: 'u-vet-01',
    name: 'Dr. Anand Deshmukh',
    role: 'veterinarian',
    district: 'Nashik',
    phone: '+91 9001234567',
    avatarInitials: 'AD',
  },
  {
    id: 'u-lab-01',
    name: 'Priya Sharma',
    role: 'lab_tech',
    district: 'Nashik',
    phone: '+91 9812345670',
    avatarInitials: 'PS',
  },
  {
    id: 'u-gov-01',
    name: 'Dr. S.K. Mishra',
    role: 'gov_officer',
    district: 'Nashik',
    phone: '+91 9900112233',
    avatarInitials: 'SM',
  },
  {
    id: 'u-admin-01',
    name: 'Admin User',
    role: 'admin',
    district: 'Nashik',
    avatarInitials: 'AU',
  },
];

export type GovernmentLocationNode = {
  name: string;
  type: 'village' | 'locality' | 'town';
};

export type GovernmentTalukaNode = {
  name: string;
  localities: GovernmentLocationNode[];
};

export type GovernmentDistrictNode = {
  name: string;
  talukas: GovernmentTalukaNode[];
};

export const MAHARASHTRA_GOVERNMENT_LOCATIONS = {
  state: 'Maharashtra',
  districts: [
    {
      name: 'Nashik',
      talukas: [
        {
          name: 'Niphad',
          localities: [
            { name: 'Chandori', type: 'village' },
          ],
        },
      ],
    },
    {
      name: 'Solapur',
      talukas: [
        {
          name: 'Barshi',
          localities: [
            { name: 'Padoshi', type: 'village' },
          ],
        },
      ],
    },
    {
      name: 'Latur',
      talukas: [
        {
          name: 'Latur',
          localities: [
            { name: 'Latur City', type: 'locality' },
          ],
        },
      ],
    },
    {
      name: 'Ahilyanagar',
      talukas: [
        {
          name: 'Ahilyanagar',
          localities: [
            { name: 'Ahilyanagar City', type: 'locality' },
          ],
        },
      ],
    },
  ] satisfies GovernmentDistrictNode[],
};

export const DEMO_CREDENTIALS: Record<string, { password: string; userId: string }> = {
  'farmer@sentinel.demo':    { password: 'demo1234', userId: 'u-farmer-01' },
  'paravet@sentinel.demo':   { password: 'demo1234', userId: 'u-paravet-01' },
  'vet@sentinel.demo':       { password: 'demo1234', userId: 'u-vet-01' },
  'lab@sentinel.demo':       { password: 'demo1234', userId: 'u-lab-01' },
  'officer@sentinel.demo':   { password: 'demo1234', userId: 'u-gov-01' },
  'admin@sentinel.demo':     { password: 'demo1234', userId: 'u-admin-01' },
};

// ----------------------------------------------------------------
// SYMPTOM CATALOG
// ----------------------------------------------------------------

export const SYMPTOM_CATALOG: Symptom[] = [
  // General
  { id: 'fever',          label: 'Fever / High body temperature',    labelHi: 'बुखार / तेज तापमान',              category: 'general' },
  { id: 'lethargy',       label: 'Lethargy / Weakness',              labelHi: 'सुस्ती / शारीरिक कमजोरी',         category: 'general' },
  { id: 'anorexia',       label: 'Loss of appetite',                 labelHi: 'भूख न लगना / चारा न खाना',         category: 'general' },
  { id: 'sudden_death',   label: 'Sudden death',                     labelHi: 'अचानक मृत्यु',                    category: 'general' },
  { id: 'weight_loss',    label: 'Rapid weight loss',                labelHi: 'तेजी से वजन घटना',                category: 'general' },

  // Respiratory
  { id: 'cough',          label: 'Cough / Sneezing',                 labelHi: 'खांसी / छींकना',                  category: 'respiratory' },
  { id: 'nasal_discharge',label: 'Nasal discharge',                  labelHi: 'नाक से स्राव / पानी बहना',         category: 'respiratory' },
  { id: 'dyspnea',        label: 'Difficulty breathing',             labelHi: 'सांस लेने में कठिनाई',            category: 'respiratory' },
  { id: 'pneumonia',      label: 'Signs of pneumonia',               labelHi: 'निमोनिया के लक्षण',               category: 'respiratory' },

  // Digestive
  { id: 'diarrhea',       label: 'Diarrhea (loose stools)',          labelHi: 'दस्त (पतले गोबर)',                category: 'digestive' },
  { id: 'bloody_diarrhea',label: 'Bloody diarrhea',                  labelHi: 'खूनी दस्त',                       category: 'digestive' },
  { id: 'bloat',          label: 'Abdominal bloat / distension',     labelHi: 'पेट फूलना / अफारा',               category: 'digestive' },
  { id: 'drooling',       label: 'Excessive salivation / drooling',  labelHi: 'मुंह से अत्यधिक लार गिरना',       category: 'digestive' },

  // Skin & External
  { id: 'vesicles_mouth', label: 'Blisters/vesicles on mouth',       labelHi: 'मुंह व जीभ पर छाले / दाने',        category: 'skin' },
  { id: 'vesicles_feet',  label: 'Blisters/vesicles on feet',        labelHi: 'खुर व पैरों में छाले',            category: 'skin' },
  { id: 'skin_nodules',   label: 'Skin nodules / lumps',             labelHi: 'त्वचा पर गांठें / ढेले (लंपी)',     category: 'skin' },
  { id: 'swelling_limbs', label: 'Swelling of limbs',                labelHi: 'पैरों व जोड़ों में सूजन',          category: 'skin' },
  { id: 'lameness',       label: 'Lameness / difficulty walking',    labelHi: 'लंगड़ाना / चलने में असमर्थ',        category: 'skin' },

  // Neurological
  { id: 'convulsions',    label: 'Convulsions / seizures',           labelHi: 'दौरे पड़ना / कंपन',               category: 'neurological' },
  { id: 'head_pressing',  label: 'Head pressing / circling',        labelHi: 'सिर दीवार से टिकाना / चक्कर',     category: 'neurological' },
  { id: 'aggression',     label: 'Unusual aggression',               labelHi: 'असामान्य आक्रामकता',              category: 'neurological' },

  // Reproductive
  { id: 'abortion',       label: 'Abortion / stillbirths',           labelHi: 'गर्भपात / मृत प्रसव',             category: 'reproductive' },
  { id: 'milk_drop',      label: 'Sudden drop in milk yield',        labelHi: 'दूध उत्पादन में भारी गिरावट',      category: 'reproductive' },
];

// ----------------------------------------------------------------
// SUSPECTED DISEASE REFERENCE
// ----------------------------------------------------------------

export const DISEASE_INFO: Record<SuspectedDisease, { name: string; species: AnimalSpecies[]; description: string }> = {
  FMD: {
    name: 'Foot and Mouth Disease',
    species: ['cattle', 'buffalo', 'sheep', 'goat', 'pig'],
    description: 'Highly contagious viral disease causing fever and blisters on mouth and feet.',
  },
  BQ: {
    name: 'Black Quarter',
    species: ['cattle', 'buffalo'],
    description: 'Acute bacterial disease causing sudden death with characteristic swelling of hind quarters.',
  },
  PPR: {
    name: 'Peste des Petits Ruminants',
    species: ['sheep', 'goat'],
    description: 'Viral disease of small ruminants causing fever, diarrhea, pneumonia and mouth lesions.',
  },
  LSD: {
    name: 'Lumpy Skin Disease',
    species: ['cattle', 'buffalo'],
    description: 'Viral disease causing nodular skin lesions, fever, and reduction in milk yield.',
  },
  HS: {
    name: 'Haemorrhagic Septicaemia',
    species: ['cattle', 'buffalo'],
    description: 'Acute bacterial disease with high mortality, causing high fever, nasal discharge, and respiratory distress.',
  },
  CCPP: {
    name: 'Contagious Caprine Pleuropneumonia',
    species: ['goat'],
    description: 'Highly contagious respiratory disease of goats with high morbidity and mortality.',
  },
  Anthrax: {
    name: 'Anthrax',
    species: ['cattle', 'buffalo', 'sheep', 'goat'],
    description: 'Bacterial zoonotic disease causing sudden death, especially in cattle and buffalo.',
  },
  Brucellosis: {
    name: 'Brucellosis',
    species: ['cattle', 'buffalo', 'sheep', 'goat'],
    description: 'Bacterial disease causing reproductive failure, abortions, and reduced milk yield.',
  },
  Rabies: {
    name: 'Rabies',
    species: ['cattle', 'buffalo', 'sheep', 'goat', 'pig', 'equine', 'other'],
    description: 'Fatal viral zoonotic disease causing neurological signs; always report to public health.',
  },
  unknown: {
    name: 'Unknown / Undifferentiated',
    species: ['cattle', 'buffalo', 'sheep', 'goat', 'pig', 'poultry', 'equine', 'other'],
    description: 'Disease identity not yet determined. Veterinary assessment required.',
  },
};

// ----------------------------------------------------------------
// MAP LOCATIONS (Nashik district synthetic hotspots)
// ----------------------------------------------------------------

export interface ExtendedMapCase {
  id: string;
  lat: number;
  lng: number;
  riskBand: 'low' | 'moderate' | 'high' | 'critical';
  species: AnimalSpecies;
  count: number;
  disease: SuspectedDisease;
  state: string;
  district: string;
  block: string;
  village: string;
  status: CaseStatus;
  clusterId?: string;
  reportedAt: string;
}

export const SYNTHETIC_MAP_CASES: ExtendedMapCase[] = [
  { id: 'LV-2026-00001', lat: 20.0059, lng: 73.7930, riskBand: 'critical', species: 'cattle',  count: 8,  disease: 'FMD', state: 'Maharashtra', district: 'Nashik', block: 'Niphad', village: 'Chandori', status: 'confirmed', clusterId: 'CL-2026-001', reportedAt: '2026-08-22T09:14:00Z' },
  { id: 'LV-2026-00002', lat: 19.9975, lng: 73.8256, riskBand: 'high',     species: 'buffalo', count: 3,  disease: 'LSD', state: 'Maharashtra', district: 'Nashik', block: 'Niphad', village: 'Niphad', status: 'vet_assessed', clusterId: 'CL-2026-001', reportedAt: '2026-08-24T07:45:00Z' },
  { id: 'LV-2026-00003', lat: 20.0412, lng: 73.8512, riskBand: 'moderate', species: 'goat',    count: 12, disease: 'PPR', state: 'Maharashtra', district: 'Nashik', block: 'Sinnar', village: 'Devpur', status: 'sample_collected', clusterId: 'CL-2026-002', reportedAt: '2026-08-25T11:20:00Z' },
  { id: 'LV-2026-00004', lat: 19.9724, lng: 73.7650, riskBand: 'high',     species: 'cattle',  count: 5,  disease: 'BQ',  state: 'Maharashtra', district: 'Nashik', block: 'Dindori', village: 'Pimpalnare', status: 'triaged', clusterId: 'CL-2026-001', reportedAt: '2026-08-23T14:10:00Z' },
  { id: 'LV-2026-00005', lat: 20.0189, lng: 73.8030, riskBand: 'critical', species: 'buffalo', count: 4,  disease: 'HS',  state: 'Maharashtra', district: 'Nashik', block: 'Niphad', village: 'Ozar', status: 'confirmed', clusterId: 'CL-2026-001', reportedAt: '2026-08-24T16:05:00Z' },
  { id: 'LV-2026-00006', lat: 19.5500, lng: 74.2000, riskBand: 'high',     species: 'cattle',  count: 9,  disease: 'FMD', state: 'Maharashtra', district: 'Ahmednagar', block: 'Sangamner', village: 'Vadner', status: 'sample_dispatched', clusterId: 'CL-2026-003', reportedAt: '2026-08-25T08:30:00Z' },
  { id: 'LV-2026-00007', lat: 18.5204, lng: 73.8567, riskBand: 'moderate', species: 'sheep',   count: 15, disease: 'PPR', state: 'Maharashtra', district: 'Pune', block: 'Baramati', village: 'Shirsuphal', status: 'reported', clusterId: 'CL-2026-004', reportedAt: '2026-08-26T10:00:00Z' },
  { id: 'LV-2026-00008', lat: 16.7050, lng: 74.2433, riskBand: 'low',      species: 'goat',    count: 2,  disease: 'CCPP', state: 'Maharashtra', district: 'Kolhapur', block: 'Kagal', village: 'Murgud', status: 'closed', reportedAt: '2026-08-21T12:00:00Z' },
];

export const SYNTHETIC_CLUSTERS: OutbreakCluster[] = [
  {
    id: 'CL-2026-001',
    clusterId: 'CL-2026-001',
    clusterName: 'Chandori-Ozar FMD & HS Hotspot Cluster',
    centerLatitude: 20.0059,
    centerLongitude: 73.7930,
    radiusMeters: 4500,
    caseIds: ['LV-2026-00001', 'LV-2026-00002', 'LV-2026-00004', 'LV-2026-00005'],
    primaryDisease: 'FMD',
    affectedState: 'Maharashtra',
    affectedDistrict: 'Nashik',
    affectedBlocks: ['Niphad', 'Dindori'],
    affectedVillages: ['Chandori', 'Niphad', 'Ozar', 'Pimpalnare', 'Vadner'],
    riskLevel: 'critical',
    activeCaseCount: 14,
    caseCount: 14,
    affectedAnimals: 42,
    riskScore: 88,
    vaccinationCoverage: 52,
    caseTrend: '+45% (Past 7 Days)',
    assignedVet: 'Dr. Anand Deshmukh (+91 9001234567)',
    sampleStatus: '6 Collected · 4 Dispatched · 2 In Processing',
    labStatus: '1 RT-PCR Positive (FMDV Type O) · 1 Pending',
    responseStatus: 'Ring Vaccination Drive Active (Target: 5,000 animals)',
    detectedAt: '2026-08-22T10:00:00Z',
    status: 'active',
  },
  {
    id: 'CL-2026-002',
    clusterId: 'CL-2026-002',
    clusterName: 'Sinnar PPR Surveillance Belt',
    centerLatitude: 20.0412,
    centerLongitude: 73.8512,
    radiusMeters: 3000,
    caseIds: ['LV-2026-00003'],
    primaryDisease: 'PPR',
    affectedState: 'Maharashtra',
    affectedDistrict: 'Nashik',
    affectedBlocks: ['Sinnar'],
    affectedVillages: ['Devpur', 'Wavi'],
    riskLevel: 'moderate',
    activeCaseCount: 5,
    caseCount: 5,
    affectedAnimals: 18,
    riskScore: 58,
    vaccinationCoverage: 68,
    caseTrend: 'Stable (-5%)',
    assignedVet: 'Dr. Ramesh Shinde (+91 9822001122)',
    sampleStatus: '2 Collected · 2 Dispatched',
    labStatus: 'Results Pending',
    responseStatus: 'Advisory Issued · Vector Control Initiated',
    detectedAt: '2026-08-25T11:00:00Z',
    status: 'monitoring',
  },
  {
    id: 'CL-2026-003',
    clusterId: 'CL-2026-003',
    clusterName: 'Sangamner FMD Border Corridor',
    centerLatitude: 19.5500,
    centerLongitude: 74.2000,
    radiusMeters: 5000,
    caseIds: ['LV-2026-00006'],
    primaryDisease: 'FMD',
    affectedState: 'Maharashtra',
    affectedDistrict: 'Ahmednagar',
    affectedBlocks: ['Sangamner'],
    affectedVillages: ['Vadner', 'Akole'],
    riskLevel: 'high',
    activeCaseCount: 9,
    caseCount: 9,
    affectedAnimals: 27,
    riskScore: 76,
    vaccinationCoverage: 48,
    caseTrend: '+20% (Past 7 Days)',
    assignedVet: 'Dr. S. P. Kulkarni (+91 9423004455)',
    sampleStatus: '3 Collected · 3 Dispatched',
    labStatus: '1 Positive · 2 Processing',
    responseStatus: 'Inter-district Movement Restriction Imposed',
    detectedAt: '2026-08-25T08:30:00Z',
    status: 'active',
  },
];

// ----------------------------------------------------------------
// DASHBOARD STATISTICS (synthetic)
// ----------------------------------------------------------------

export const SYNTHETIC_DASHBOARD_STATS: DashboardStats = {
  totalActiveCases: 42,
  activeSuspectedCases: 26,
  confirmedCases: 16,
  emergingClusters: 4,
  highRiskVillages: 9,
  vaccinationCoverage: 61.8,
  pendingSamples: 14,
  avgReportingTimeHours: 3.8,
  avgResponseTimeHours: 16.2,
  resolvedCases: 58,
  highRiskCases: 11,
  labPendingResults: 14,
  confirmedOutbreaks: 3,
  casesLast7Days: [5, 8, 6, 11, 9, 14, 11],
  speciesBreakdown: [
    { species: 'cattle',  count: 22 },
    { species: 'buffalo', count: 11 },
    { species: 'goat',    count: 6  },
    { species: 'sheep',   count: 2  },
    { species: 'pig',     count: 1  },
  ],
  riskBreakdown: [
    { riskBand: 'critical', count: 6 },
    { riskBand: 'high',     count: 11 },
    { riskBand: 'moderate', count: 17 },
    { riskBand: 'low',      count: 8 },
  ],
  districtHotspots: [
    { district: 'Nashik',     count: 14, riskBand: 'high'     },
    { district: 'Ahilyanagar', count: 9,  riskBand: 'moderate' },
    { district: 'Pune',       count: 6,  riskBand: 'moderate' },
    { district: 'Nashik',     count: 18, riskBand: 'critical' },
    { district: 'Ahmednagar', count: 12, riskBand: 'high'     },
    { district: 'Pune',       count: 7,  riskBand: 'moderate' },
    { district: 'Kolhapur',   count: 5,  riskBand: 'low'      },
  ],
  districtComparison: [
    { district: 'Nashik',     activeCases: 18, confirmedCases: 8, riskBand: 'critical', vaccinationCoverage: 52.4 },
    { district: 'Ahmednagar', activeCases: 12, confirmedCases: 5, riskBand: 'high',     vaccinationCoverage: 58.0 },
    { district: 'Pune',       activeCases: 7,  confirmedCases: 2, riskBand: 'moderate', vaccinationCoverage: 71.2 },
    { district: 'Kolhapur',   activeCases: 5,  confirmedCases: 1, riskBand: 'low',      vaccinationCoverage: 84.5 },
  ],
  responseTimeBreakdown: [
    { stage: 'Farmer Report to AI Triage', hours: 0.5 },
    { stage: 'Triage to Vet Assignment',   hours: 3.3 },
    { stage: 'Vet Assignment to Visit',   hours: 12.4 },
    { stage: 'Visit to Sample Dispatch',   hours: 4.5 },
  ],
  labTurnaroundBreakdown: [
    { stage: 'Sample Collection',  hours: 2.1 },
    { stage: 'Cold Chain Transit', hours: 14.5 },
    { stage: 'Lab Intake & Prep',  hours: 1.8 },
    { stage: 'RT-PCR Run & Entry', hours: 6.2 },
  ],
  isSynthetic: true,
};

// ----------------------------------------------------------------
// SYNTHETIC CASES (Canonical ID LV-2026-XXXXX)
// ----------------------------------------------------------------

export const SYNTHETIC_CASES: CaseRecord[] = [
  {
    id: 'LV-2026-00001',
    incidentReport: {
      id: 'ir-LV-2026-00001',
      reportedBy: 'u-farmer-01',
      reporterRole: 'farmer',
      createdAt: '2026-08-22T09:14:00Z',
      updatedAt: '2026-08-23T11:30:00Z',
      species: 'cattle',
      totalAnimals: 12,
      affectedAnimals: 8,
      deadAnimals: 1,
      symptomIds: ['fever', 'vesicles_mouth', 'vesicles_feet', 'drooling', 'lameness'],
      onsetDate: '2026-08-20',
      durationDays: 2,
      additionalNotes: 'Animals not eating. Two animals unable to walk.',
      location: {
        latitude: 20.0059,
        longitude: 73.7930,
        village: 'Chandori',
        block: 'Niphad',
        district: 'Nashik',
        state: 'Maharashtra',
      },
      isVaccinated: false,
      status: 'confirmed',
    },
    triageResult: {
      id: 'ra-LV-2026-00001',
      caseId: 'LV-2026-00001',
      incidentId: 'LV-2026-00001',
      computedAt: '2026-08-22T09:15:30Z',
      riskScore: 84,
      riskBand: 'high',
      suspectedDisease: 'FMD',
      factors: [
        { label: 'Similar cases in 72h radius',    value: '6 cases within 10km', weight: 28, direction: 'risk' },
        { label: 'Confirmed case nearby',           value: 'Vadner (8km away)',   weight: 22, direction: 'risk' },
        { label: 'Vaccination status',              value: 'Not vaccinated',      weight: 18, direction: 'risk' },
        { label: 'Symptom cluster match',           value: 'FMD pattern (92%)',   weight: 16, direction: 'risk' },
        { label: 'Case trend (7-day)',              value: '↑ Increasing',        weight: 12, direction: 'risk' },
        { label: 'Environmental conditions',        value: 'Post-monsoon risk',   weight: 8,  direction: 'risk' },
      ],
      recommendation: 'Immediate veterinary assessment and sample collection recommended. Consider movement restriction.',
      disclaimer: 'This is an AI-assisted risk assessment based on reported symptoms. It is NOT a definitive diagnosis. Veterinary confirmation is mandatory before any official action.',
      modelVersion: 'sentinel-triage-mock-v1.0',
      isSynthetic: true,
    },
    vetAssessment: {
      vetId: 'u-vet-01',
      assessedAt: '2026-08-22T14:30:00Z',
      clinicalFindings: 'Classic vesicular lesions observed on tongue, dental pad, and coronary band of 7 animals. Profuse salivation.',
      agreedWithAiRisk: true,
      clinicalDiagnosis: 'FMD',
      requiresSample: true,
      treatmentRecommended: 'Symptomatic treatment, mouth washes, hoof care.',
      quarantineRecommended: true,
      notes: 'Movement restriction advised for adjoining 3 villages.',
    },
    sampleCollection: {
      id: 'smp-LV-2026-00001',
      caseId: 'LV-2026-00001',
      sampleId: 'smp-LV-2026-00001',
      collectedByUserId: 'u-paravet-01',
      collectedBy: 'u-paravet-01',
      collectedAt: '2026-08-22T16:00:00Z',
      sampleType: 'Epithelial tissue and vesicular fluid',
      animalCountSampled: 3,
      animalCount: 3,
      barcode: 'SNT-2026-00001',
      destinationLabName: 'NRFMD-Mukteswar Regional Lab',
      destinationLab: 'NRFMD-Mukteswar Regional Lab',
      dispatchedAt: '2026-08-22T18:30:00Z',
      receivedAt: '2026-08-23T08:00:00Z',
      chainOfCustody: [
        { step: 'Collected',   timestamp: '2026-08-22T16:00:00Z', handledBy: 'Sunita Patil',     notes: 'Collected in cold chain' },
        { step: 'Dispatched',  timestamp: '2026-08-22T18:30:00Z', handledBy: 'Transport Unit-3',  notes: 'Cold chain vehicle' },
        { step: 'Received',    timestamp: '2026-08-23T08:00:00Z', handledBy: 'Lab Reception',     notes: 'Integrity intact' },
      ],
    },
    labResult: {
      id: 'lr-LV-2026-00001',
      sampleId: 'smp-LV-2026-00001',
      caseId: 'LV-2026-00001',
      labUserId: 'u-lab-01',
      techId: 'u-lab-01',
      labId: 'lab-nrfmd-01',
      resultEnteredAt: '2026-08-24T10:00:00Z',
      completedAt: '2026-08-24T10:00:00Z',
      testName: 'RT-PCR FMD Serotyping',
      status: 'positive',
      pathogenConfirmed: 'FMDV',
      pathogen: 'FMDV',
      serotype: 'Type O',
      ctValue: 18.4,
      notes: 'Serotype O confirmed. Ct value 18.4.',
      confirmedDisease: 'FMD',
    },
    containmentActions: [
      {
        id: 'ca-001',
        caseId: 'LV-2026-00001',
        type: 'movement_restriction',
        orderedByUserId: 'u-gov-01',
        orderedBy: 'u-gov-01',
        orderedAt: '2026-08-22T20:00:00Z',
        status: 'in_progress',
        description: 'Animal movement restriction imposed for Chandori, Niphad, Vadner blocks.',
        affectedVillages: ['Chandori', 'Niphad', 'Vadner', 'Ozar'],
      },
      {
        id: 'ca-002',
        caseId: 'LV-2026-00001',
        type: 'vaccination_drive',
        orderedByUserId: 'u-gov-01',
        orderedBy: 'u-gov-01',
        orderedAt: '2026-08-24T09:00:00Z',
        status: 'planned',
        description: 'Ring vaccination campaign targeting 5000 animals in affected villages.',
        affectedVillages: ['Chandori', 'Niphad', 'Vadner', 'Ozar', 'Pimpalnare'],
      },
    ],
    timeline: [
      { id: 'tl-001', caseId: 'LV-2026-00001', timestamp: '2026-08-22T09:14:00Z', eventType: 'incident_reported',    actorId: 'u-farmer-01',  actorRole: 'farmer',       summary: 'Incident reported by farmer Ramesh Kumar. Canonical ID: LV-2026-00001' },
      { id: 'tl-002', caseId: 'LV-2026-00001', timestamp: '2026-08-22T09:15:30Z', eventType: 'triage_completed',     actorId: 'system',       actorRole: 'admin',        summary: 'AI triage completed. Risk Score: 84% (High)' },
      { id: 'tl-003', caseId: 'LV-2026-00001', timestamp: '2026-08-22T09:30:00Z', eventType: 'vet_assigned',         actorId: 'u-gov-01',     actorRole: 'gov_officer',  summary: 'Assigned to Dr. Anand Deshmukh' },
      { id: 'tl-004', caseId: 'LV-2026-00001', timestamp: '2026-08-22T14:30:00Z', eventType: 'vet_assessed',         actorId: 'u-vet-01',     actorRole: 'veterinarian', summary: 'Veterinary assessment completed. Sample collection ordered.' },
      { id: 'tl-005', caseId: 'LV-2026-00001', timestamp: '2026-08-22T16:00:00Z', eventType: 'sample_collected',     actorId: 'u-paravet-01', actorRole: 'paravet',      summary: 'Samples collected — Barcode: SNT-2026-00001' },
      { id: 'tl-006', caseId: 'LV-2026-00001', timestamp: '2026-08-22T18:30:00Z', eventType: 'sample_dispatched',    actorId: 'u-paravet-01', actorRole: 'paravet',      summary: 'Sample dispatched to NRFMD-Mukteswar lab' },
      { id: 'tl-007', caseId: 'LV-2026-00001', timestamp: '2026-08-23T08:00:00Z', eventType: 'sample_received',      actorId: 'u-lab-01',     actorRole: 'lab_tech',     summary: 'Sample received at laboratory, cold chain intact' },
      { id: 'tl-008', caseId: 'LV-2026-00001', timestamp: '2026-08-24T10:00:00Z', eventType: 'lab_result',           actorId: 'u-lab-01',     actorRole: 'lab_tech',     summary: 'RT-PCR POSITIVE — FMDV Serotype O confirmed' },
      { id: 'tl-009', caseId: 'LV-2026-00001', timestamp: '2026-08-24T11:00:00Z', eventType: 'containment_ordered',  actorId: 'u-gov-01',     actorRole: 'gov_officer',  summary: 'Movement restriction and vaccination drive ordered' },
    ],
  },
  // Case 2 — in progress
  {
    id: 'LV-2026-00002',
    incidentReport: {
      id: 'ir-LV-2026-00002',
      reportedBy: 'u-paravet-01',
      reporterRole: 'paravet',
      createdAt: '2026-08-24T07:45:00Z',
      updatedAt: '2026-08-24T09:00:00Z',
      species: 'buffalo',
      totalAnimals: 6,
      affectedAnimals: 2,
      deadAnimals: 0,
      symptomIds: ['skin_nodules', 'fever', 'milk_drop', 'nasal_discharge'],
      onsetDate: '2026-08-23',
      durationDays: 1,
      location: {
        latitude: 19.9975,
        longitude: 73.8256,
        village: 'Niphad',
        block: 'Niphad',
        district: 'Nashik',
        state: 'Maharashtra',
      },
      isVaccinated: true,
      lastVaccinationDate: '2025-11-15',
      vaccineNames: 'Lumpivax',
      status: 'vet_assessed',
    },
    triageResult: {
      id: 'ra-LV-2026-00002',
      caseId: 'LV-2026-00002',
      incidentId: 'LV-2026-00002',
      computedAt: '2026-08-24T07:46:00Z',
      riskScore: 61,
      riskBand: 'moderate',
      suspectedDisease: 'LSD',
      factors: [
        { label: 'Symptom pattern match',      value: 'LSD pattern (78%)',      weight: 25, direction: 'risk'       },
        { label: 'Cases in proximity',         value: '3 cases within 15km',   weight: 20, direction: 'risk'       },
        { label: 'Vaccination on record',      value: 'Vaccinated Nov 2025',   weight: 20, direction: 'protective' },
        { label: 'Animals affected',           value: '2 of 6 (33%)',          weight: 15, direction: 'risk'       },
        { label: 'Season / environmental',     value: 'Monsoon end — high risk',weight: 10, direction: 'risk'      },
        { label: 'No mortality',               value: '0 deaths reported',     weight: 10, direction: 'protective' },
      ],
      recommendation: 'Veterinary assessment recommended. Monitor remaining herd. Sample collection may be required.',
      disclaimer: 'This is an AI-assisted risk assessment based on reported symptoms. It is NOT a definitive diagnosis. Veterinary confirmation is mandatory before any official action.',
      modelVersion: 'sentinel-triage-mock-v1.0',
      isSynthetic: true,
    },
    timeline: [
      { id: 'tl-101', caseId: 'LV-2026-00002', timestamp: '2026-08-24T07:45:00Z', eventType: 'incident_reported', actorId: 'u-paravet-01', actorRole: 'paravet',      summary: 'Incident reported by paravet Sunita Patil. Canonical ID: LV-2026-00002' },
      { id: 'tl-102', caseId: 'LV-2026-00002', timestamp: '2026-08-24T07:46:00Z', eventType: 'triage_completed',  actorId: 'system',       actorRole: 'admin',        summary: 'AI triage completed. Risk Score: 61% (Moderate)' },
      { id: 'tl-103', caseId: 'LV-2026-00002', timestamp: '2026-08-24T09:00:00Z', eventType: 'vet_assessed',      actorId: 'u-vet-01',     actorRole: 'veterinarian', summary: 'Veterinary assessment in progress' },
    ],
  },
];

// ----------------------------------------------------------------
// NOTIFICATIONS (synthetic)
// ----------------------------------------------------------------

export const SYNTHETIC_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-001',
    severity: 'critical',
    title: 'OUTBREAK ALERT — FMD Confirmed',
    message: 'FMDV Serotype O confirmed in Nashik district (Chandori). Case ID: LV-2026-00001.',
    timestamp: '2026-08-24T11:00:00Z',
    isRead: false,
    caseId: 'LV-2026-00001',
    actionLabel: 'View Case',
    actionPath: '/cases/LV-2026-00001',
    createdAt: '2026-08-24T11:00:00Z',
  },
  {
    id: 'notif-002',
    severity: 'warning',
    title: 'New High-Risk Case — Niphad Block',
    message: '8 cattle affected, FMD suspected. Case ID: LV-2026-00001.',
    timestamp: '2026-08-22T09:16:00Z',
    isRead: false,
    targetRoles: ['veterinarian', 'gov_officer'],
    caseId: 'LV-2026-00001',
    actionLabel: 'Assign Vet',
    actionPath: '/vet-console',
    createdAt: '2026-08-22T09:16:00Z',
  },
  {
    id: 'notif-003',
    severity: 'info',
    title: 'Sample Received — SNT-2026-00001',
    message: 'Sample from Chandori case (LV-2026-00001) received at NRFMD lab.',
    timestamp: '2026-08-23T08:00:00Z',
    isRead: true,
    targetRoles: ['lab_tech', 'gov_officer'],
    actionLabel: 'Track Sample',
    actionPath: '/lab-tracker',
    createdAt: '2026-08-23T08:00:00Z',
  },
];
