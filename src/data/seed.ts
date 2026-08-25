// ============================================================
// LIVESTOCK SENTINEL — Synthetic Seed Data
// [SYNTHETIC DATA] — Not real government or animal health data
// ============================================================

import type {
  User, CaseRecord, DashboardStats, AppNotification,
  Symptom, SuspectedDisease, AnimalSpecies
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
    district: 'Maharashtra',
    avatarInitials: 'AU',
  },
];

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
  { id: 'fever',          label: 'Fever / High body temperature',    category: 'general' },
  { id: 'lethargy',       label: 'Lethargy / Weakness',              category: 'general' },
  { id: 'anorexia',       label: 'Loss of appetite',                 category: 'general' },
  { id: 'sudden_death',   label: 'Sudden death',                     category: 'general' },
  { id: 'weight_loss',    label: 'Rapid weight loss',                category: 'general' },

  // Respiratory
  { id: 'cough',          label: 'Cough / Sneezing',                 category: 'respiratory' },
  { id: 'nasal_discharge',label: 'Nasal discharge',                  category: 'respiratory' },
  { id: 'dyspnea',        label: 'Difficulty breathing',             category: 'respiratory' },
  { id: 'pneumonia',      label: 'Signs of pneumonia',               category: 'respiratory' },

  // Digestive
  { id: 'diarrhea',       label: 'Diarrhea (loose stools)',          category: 'digestive' },
  { id: 'bloody_diarrhea',label: 'Bloody diarrhea',                  category: 'digestive' },
  { id: 'bloat',          label: 'Abdominal bloat / distension',     category: 'digestive' },
  { id: 'drooling',       label: 'Excessive salivation / drooling',  category: 'digestive' },

  // Skin & External
  { id: 'vesicles_mouth', label: 'Blisters/vesicles on mouth',       category: 'skin' },
  { id: 'vesicles_feet',  label: 'Blisters/vesicles on feet',        category: 'skin' },
  { id: 'skin_nodules',   label: 'Skin nodules / lumps',             category: 'skin' },
  { id: 'swelling_limbs', label: 'Swelling of limbs',                category: 'skin' },
  { id: 'lameness',       label: 'Lameness / difficulty walking',    category: 'skin' },

  // Neurological
  { id: 'convulsions',    label: 'Convulsions / seizures',           category: 'neurological' },
  { id: 'head_pressing',  label: 'Head pressing / circling',        category: 'neurological' },
  { id: 'aggression',     label: 'Unusual aggression',               category: 'neurological' },

  // Reproductive
  { id: 'abortion',       label: 'Abortion / stillbirths',           category: 'reproductive' },
  { id: 'milk_drop',      label: 'Sudden drop in milk yield',        category: 'reproductive' },
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

export const SYNTHETIC_MAP_CASES = [
  { id: 'mc-01', lat: 20.0059, lng: 73.7930, riskBand: 'high',     species: 'cattle',  count: 8,  disease: 'FMD',  village: 'Chandori' },
  { id: 'mc-02', lat: 19.9975, lng: 73.8256, riskBand: 'moderate', species: 'buffalo', count: 3,  disease: 'LSD',  village: 'Niphad' },
  { id: 'mc-03', lat: 20.0412, lng: 73.8512, riskBand: 'low',      species: 'goat',    count: 12, disease: 'PPR',  village: 'Devpur' },
  { id: 'mc-04', lat: 19.9724, lng: 73.7650, riskBand: 'high',     species: 'cattle',  count: 5,  disease: 'BQ',   village: 'Pimpalnare' },
  { id: 'mc-05', lat: 20.0189, lng: 73.8030, riskBand: 'moderate', species: 'buffalo', count: 2,  disease: 'HS',   village: 'Ozar' },
  { id: 'mc-06', lat: 20.0610, lng: 73.7800, riskBand: 'high',     species: 'cattle',  count: 15, disease: 'FMD',  village: 'Vadner' },
  { id: 'mc-07', lat: 20.0311, lng: 73.8700, riskBand: 'low',      species: 'sheep',   count: 6,  disease: 'PPR',  village: 'Savargaon' },
  { id: 'mc-08', lat: 19.9880, lng: 73.8410, riskBand: 'moderate', species: 'pig',     count: 4,  disease: 'unknown', village: 'Kasbe Sukene' },
] as const;

// ----------------------------------------------------------------
// DASHBOARD STATISTICS (synthetic)
// ----------------------------------------------------------------

export const SYNTHETIC_DASHBOARD_STATS: DashboardStats = {
  totalActiveCases: 34,
  highRiskCases: 7,
  labPendingResults: 12,
  confirmedOutbreaks: 3,
  casesLast7Days: [4, 7, 5, 9, 6, 11, 8],
  speciesBreakdown: [
    { species: 'cattle',  count: 18 },
    { species: 'buffalo', count: 8  },
    { species: 'goat',    count: 5  },
    { species: 'sheep',   count: 2  },
    { species: 'pig',     count: 1  },
  ],
  districtHotspots: [
    { district: 'Nashik',     count: 14, riskBand: 'high'     },
    { district: 'Ahmednagar', count: 9,  riskBand: 'moderate' },
    { district: 'Pune',       count: 6,  riskBand: 'moderate' },
    { district: 'Kolhapur',   count: 5,  riskBand: 'low'      },
  ],
  isSynthetic: true,
};

// ----------------------------------------------------------------
// SYNTHETIC CASES (pipeline demonstration)
// ----------------------------------------------------------------

export const SYNTHETIC_CASES: CaseRecord[] = [
  {
    id: 'case-001',
    incidentReport: {
      id: 'ir-001',
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
      incidentId: 'ir-001',
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
      clinicalDiagnosis: 'Suspected FMD — Requires Lab Confirmation',
      requiresSample: true,
      treatmentRecommended: 'Symptomatic treatment, mouth washes, hoof care.',
      quarantineRecommended: true,
      notes: 'Movement restriction advised for adjoining 3 villages.',
    },
    sampleCollection: {
      sampleId: 'smp-001',
      collectedBy: 'u-paravet-01',
      collectedAt: '2026-08-22T16:00:00Z',
      sampleType: 'Epithelial tissue and vesicular fluid',
      animalCount: 3,
      barcode: 'SNT-2608-001',
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
      sampleId: 'smp-001',
      labId: 'lab-nrfmd-01',
      techId: 'u-lab-01',
      resultEnteredAt: '2026-08-24T10:00:00Z',
      testName: 'RT-PCR FMD Serotyping',
      status: 'positive',
      pathogen: 'FMDV',
      serotype: 'Type O',
      notes: 'Serotype O confirmed. Ct value 18.4.',
      confirmedDisease: 'FMD',
    },
    containmentActions: [
      {
        id: 'ca-001',
        caseId: 'case-001',
        type: 'movement_restriction',
        orderedBy: 'u-gov-01',
        orderedAt: '2026-08-22T20:00:00Z',
        status: 'in_progress',
        description: 'Animal movement restriction imposed for Chandori, Niphad, Vadner blocks.',
        affectedVillages: ['Chandori', 'Niphad', 'Vadner', 'Ozar'],
      },
      {
        id: 'ca-002',
        caseId: 'case-001',
        type: 'vaccination_drive',
        orderedBy: 'u-gov-01',
        orderedAt: '2026-08-24T09:00:00Z',
        status: 'planned',
        description: 'Ring vaccination campaign targeting 5000 animals in affected villages.',
        affectedVillages: ['Chandori', 'Niphad', 'Vadner', 'Ozar', 'Pimpalnare'],
      },
    ],
    timeline: [
      { id: 'tl-001', caseId: 'case-001', timestamp: '2026-08-22T09:14:00Z', eventType: 'incident_reported',    actorId: 'u-farmer-01',  actorRole: 'farmer',       summary: 'Incident reported by farmer Ramesh Kumar' },
      { id: 'tl-002', caseId: 'case-001', timestamp: '2026-08-22T09:15:30Z', eventType: 'triage_completed',     actorId: 'system',       actorRole: 'admin',        summary: 'AI triage completed. Risk Score: 84% (High)' },
      { id: 'tl-003', caseId: 'case-001', timestamp: '2026-08-22T09:30:00Z', eventType: 'vet_assigned',         actorId: 'u-gov-01',     actorRole: 'gov_officer',  summary: 'Assigned to Dr. Anand Deshmukh' },
      { id: 'tl-004', caseId: 'case-001', timestamp: '2026-08-22T14:30:00Z', eventType: 'vet_assessed',         actorId: 'u-vet-01',     actorRole: 'veterinarian', summary: 'Veterinary assessment completed. Sample collection ordered.' },
      { id: 'tl-005', caseId: 'case-001', timestamp: '2026-08-22T16:00:00Z', eventType: 'sample_collected',     actorId: 'u-paravet-01', actorRole: 'paravet',      summary: 'Samples collected — Barcode: SNT-2608-001' },
      { id: 'tl-006', caseId: 'case-001', timestamp: '2026-08-22T18:30:00Z', eventType: 'sample_dispatched',    actorId: 'u-paravet-01', actorRole: 'paravet',      summary: 'Sample dispatched to NRFMD-Mukteswar lab' },
      { id: 'tl-007', caseId: 'case-001', timestamp: '2026-08-23T08:00:00Z', eventType: 'sample_received',      actorId: 'u-lab-01',     actorRole: 'lab_tech',     summary: 'Sample received at laboratory, cold chain intact' },
      { id: 'tl-008', caseId: 'case-001', timestamp: '2026-08-24T10:00:00Z', eventType: 'lab_result',           actorId: 'u-lab-01',     actorRole: 'lab_tech',     summary: 'RT-PCR POSITIVE — FMDV Serotype O confirmed' },
      { id: 'tl-009', caseId: 'case-001', timestamp: '2026-08-24T11:00:00Z', eventType: 'containment_ordered',  actorId: 'u-gov-01',     actorRole: 'gov_officer',  summary: 'Movement restriction and vaccination drive ordered' },
    ],
  },
  // Case 2 — in progress
  {
    id: 'case-002',
    incidentReport: {
      id: 'ir-002',
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
      incidentId: 'ir-002',
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
      { id: 'tl-101', caseId: 'case-002', timestamp: '2026-08-24T07:45:00Z', eventType: 'incident_reported', actorId: 'u-paravet-01', actorRole: 'paravet',      summary: 'Incident reported by paravet Sunita Patil' },
      { id: 'tl-102', caseId: 'case-002', timestamp: '2026-08-24T07:46:00Z', eventType: 'triage_completed',  actorId: 'system',       actorRole: 'admin',        summary: 'AI triage completed. Risk Score: 61% (Moderate)' },
      { id: 'tl-103', caseId: 'case-002', timestamp: '2026-08-24T09:00:00Z', eventType: 'vet_assessed',      actorId: 'u-vet-01',     actorRole: 'veterinarian', summary: 'Veterinary assessment in progress' },
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
    message: 'FMDV Serotype O confirmed in Nashik district (Chandori). Containment actions initiated.',
    timestamp: '2026-08-24T11:00:00Z',
    isRead: false,
    caseId: 'case-001',
    actionLabel: 'View Case',
    actionPath: '/cases/case-001',
  },
  {
    id: 'notif-002',
    severity: 'warning',
    title: 'New High-Risk Case — Niphad Block',
    message: '8 cattle affected, FMD suspected. Veterinary assessment pending.',
    timestamp: '2026-08-22T09:16:00Z',
    isRead: false,
    targetRoles: ['veterinarian', 'gov_officer'],
    caseId: 'case-001',
    actionLabel: 'Assign Vet',
    actionPath: '/vet-console',
  },
  {
    id: 'notif-003',
    severity: 'info',
    title: 'Sample Received — SNT-2608-001',
    message: 'Sample from Chandori case received at NRFMD lab. Cold chain intact.',
    timestamp: '2026-08-23T08:00:00Z',
    isRead: true,
    targetRoles: ['lab_tech', 'gov_officer'],
    actionLabel: 'Track Sample',
    actionPath: '/lab-tracker',
  },
];
