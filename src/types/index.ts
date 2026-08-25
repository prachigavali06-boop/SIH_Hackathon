// ============================================================
// LIVESTOCK SENTINEL — Shared Core Data Models & API Contracts
// Member 1 — Backend, Supabase Integration & Foundation Layer
// Pre-Merge Safety Compliant: Triage & Risk Scoring (No Autonomous Diagnosis)
// ============================================================

// ----------------------------------------------------------------
// STEP 5: Roles & Access Control
// ----------------------------------------------------------------

export type UserRole =
  | 'farmer'
  | 'field_worker'
  | 'paravet'
  | 'veterinarian'
  | 'laboratory'
  | 'lab_tech'
  | 'government_officer'
  | 'gov_officer'
  | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  district: string;
  block?: string;
  village?: string;
  phone?: string;
  email?: string;
  avatarInitials: string;
  createdAt?: string;
  updatedAt?: string;
}

// ----------------------------------------------------------------
// STEP 3: Canonical Case ID Standardizer
// ----------------------------------------------------------------

/**
 * Standard Canonical Case ID Generator: LV-YYYY-XXXXX
 * e.g., LV-2026-00001
 */
export function generateCanonicalCaseId(sequenceNumber: number, year: number = new Date().getFullYear()): string {
  const paddedSeq = String(sequenceNumber).padStart(5, '0');
  return `LV-${year}-${paddedSeq}`;
}

export type RiskBand = 'low' | 'moderate' | 'high' | 'critical';

export type CaseStatus =
  | 'reported'
  | 'triaged'
  | 'vet_assigned'
  | 'vet_assessed'
  | 'sample_collected'
  | 'sample_dispatched'
  | 'sample_received'
  | 'lab_processing'
  | 'result_pending'
  | 'result_negative'
  | 'result_positive'
  | 'confirmed'
  | 'contained'
  | 'closed';

export type LabResultStatus =
  | 'pending'
  | 'processing'
  | 'positive'
  | 'negative'
  | 'inconclusive';

export type AnimalSpecies =
  | 'cattle'
  | 'buffalo'
  | 'sheep'
  | 'goat'
  | 'pig'
  | 'poultry'
  | 'equine'
  | 'other';

export type SuspectedDisease =
  | 'FMD'          // Foot and Mouth Disease
  | 'BQ'           // Black Quarter
  | 'PPR'          // Peste des Petits Ruminants
  | 'LSD'          // Lumpy Skin Disease
  | 'HS'           // Haemorrhagic Septicaemia
  | 'CCPP'         // Contagious Caprine Pleuropneumonia
  | 'Anthrax'
  | 'Brucellosis'
  | 'Rabies'
  | 'unknown';

// ----------------------------------------------------------------
// STEP 2: Strongly Typed Models for All 16 Entities
// ----------------------------------------------------------------

// 1. Animal
export interface Animal {
  id: string;
  farmId: string;
  species: AnimalSpecies;
  breed?: string;
  tagNumber?: string;
  ageMonths?: number;
  gender?: 'male' | 'female';
  healthStatus: 'healthy' | 'suspected' | 'diseased' | 'quarantined' | 'deceased';
  createdAt?: string;
  updatedAt?: string;
}

// 2. Farm / Herd
export interface FarmOrHerd {
  id: string;
  ownerFarmerId: string;
  farmName?: string;
  village: string;
  block: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  totalAnimalCount: number;
  speciesCounts: Partial<Record<AnimalSpecies, number>>;
  createdAt?: string;
  updatedAt?: string;
}

// 3. HealthCase (Master Record linked via Canonical Case ID)
export interface HealthCase {
  id: string;                 // Canonical ID e.g. LV-2026-00001
  farmId?: string;
  reportedByUserId: string;
  reporterRole: UserRole;
  status: CaseStatus;
  riskBand: RiskBand;
  primarySpecies: AnimalSpecies;
  totalAnimalsInHerd: number;
  affectedAnimalCount: number;
  deadAnimalCount: number;
  village: string;
  block: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  syndromeCategory?: string;           // Non-definitive AI/field syndrome (e.g., "Vesicular Lesions")
  suspectedDisease?: SuspectedDisease;  // Non-definitive AI suspicion
  confirmedDisease?: SuspectedDisease;  // DEFINITIVE: Populated ONLY by Vet/Lab workflow
  assignedVetUserId?: string;
  assignedLabUserId?: string;
  createdAt: string;
  updatedAt: string;
}

// 4. SymptomReport
export interface Symptom {
  id: string;
  label: string;
  category: 'general' | 'respiratory' | 'digestive' | 'skin' | 'neurological' | 'reproductive';
}

export interface SymptomReport {
  id: string;
  caseId: string;             // Canonical Case ID
  symptomIds: string[];
  onsetDate: string;
  durationDays: number;
  additionalNotes?: string;
  reportedAt: string;
}

// 5. VaccinationRecord
export interface VaccinationRecord {
  id: string;
  farmId?: string;
  caseId?: string;
  species: AnimalSpecies;
  vaccineName: string;
  batchNumber?: string;
  administeredByUserId: string;
  administeredAt: string;
  nextDueDate?: string;
}

// 6. TreatmentRecord
export interface TreatmentRecord {
  id: string;
  caseId: string;             // Canonical Case ID
  prescribedByVetId: string;
  medicationName: string;
  dosage?: string;
  instructions?: string;
  administeredAt: string;
}

// 7. RiskAssessment (AI / Automated Triage Output — NO Autonomous Diagnosis)
export interface TriageFactor {
  label: string;
  value: string;
  weight: number;
  direction: 'risk' | 'protective';
}

export interface RiskAssessment {
  id: string;
  caseId: string;                      // Canonical Case ID
  riskScore: number;                   // 0 - 100
  riskBand: RiskBand;
  syndromeCategory?: string;           // e.g. "Vesicular Disease Pattern"
  suspectedDisease?: SuspectedDisease; // NON-DEFINITIVE AI suspicion
  factors: TriageFactor[];             // Contributing factors
  recommendation: string;
  requiresVeterinaryAssessment?: boolean; // Default true (Safety rule)
  disclaimer: string;
  modelVersion: string;
  isSynthetic: boolean;
  computedAt: string;
}

// 8. OutbreakCluster (Spatio-Temporal Detection)
export interface OutbreakCluster {
  id: string;
  clusterName: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  caseIds: string[];          // List of Canonical Case IDs
  primaryDisease: SuspectedDisease;
  affectedDistrict: string;
  affectedBlocks: string[];
  riskLevel: RiskBand;
  activeCaseCount: number;
  detectedAt: string;
  status: 'active' | 'monitoring' | 'contained' | 'resolved';
}

// 9. VetAssignment
export interface VetAssignment {
  id: string;
  caseId: string;             // Canonical Case ID
  assignedVetUserId: string;
  assignedByUserId: string;
  assignedAt: string;
  status: 'pending' | 'accepted' | 'completed' | 'reassigned';
  notes?: string;
}

// 10. FieldVisit (Authorized Veterinary Clinical Diagnosis)
export interface FieldVisit {
  id: string;
  caseId: string;             // Canonical Case ID
  visitedByUserId: string;
  visitorRole: UserRole;
  visitedAt: string;
  clinicalObservations: string;
  temperatureCelsius?: number;
  agreedWithAiRisk: boolean;
  revisedRiskBand?: RiskBand;
  clinicalDiagnosis?: SuspectedDisease; // Veterinary Clinical Opinion
  quarantineRecommended: boolean;
  sampleRequired: boolean;
  notes?: string;
}

// 11. Sample
export interface ChainStep {
  step: string;
  timestamp: string;
  handledBy: string;
  notes?: string;
}

export interface Sample {
  id: string;
  caseId: string;             // Canonical Case ID
  barcode: string;            // e.g. SNT-2026-00001
  sampleType: string;         // e.g. "Blood Serum", "Epithelial Tissue"
  collectedByUserId: string;
  collectedAt: string;
  animalCountSampled: number;
  destinationLabName: string;
  dispatchedAt?: string;
  receivedAt?: string;
  chainOfCustody: ChainStep[];
}

// 12. LabResult (DEFINITIVE Laboratory Diagnostic Outcome)
export interface LabResult {
  id: string;
  sampleId: string;
  caseId: string;             // Canonical Case ID
  labUserId: string;
  testName: string;
  status: LabResultStatus;
  pathogenConfirmed?: string; // DEFINITIVE Pathogen Name (e.g. "FMDV")
  pathogen?: string;           // alias for backwards compatibility
  techId?: string;             // alias for backwards compatibility
  labId?: string;              // alias for backwards compatibility
  resultEnteredAt?: string;    // alias for backwards compatibility
  serotype?: string;           // DEFINITIVE Serotype (e.g. "Type O")
  confirmedDisease?: SuspectedDisease; // DEFINITIVE Disease Name
  ctValue?: number;
  notes?: string;
  completedAt: string;
}

// 13. Alert
export type NotificationSeverity = 'info' | 'warning' | 'danger' | 'success' | 'critical';

export interface Alert {
  id: string;
  caseId?: string;            // Canonical Case ID
  severity: NotificationSeverity;
  title: string;
  message: string;
  targetRoles?: UserRole[];
  targetDistrict?: string;
  isRead: boolean;
  actionPath?: string;
  actionLabel?: string;
  createdAt: string;
  timestamp?: string;          // alias for backwards compatibility
}

// 14. Advisory
export interface Advisory {
  id: string;
  title: string;
  content: string;
  diseaseTarget?: SuspectedDisease;
  targetSpecies?: AnimalSpecies[];
  targetDistricts?: string[];
  issuedByUserId: string;
  issuedAt: string;
  effectiveUntil?: string;
  isPublic: boolean;
}

// 15. ResponseAction (Containment & Gov Actions)
export interface ResponseAction {
  id: string;
  caseId: string;             // Canonical Case ID
  clusterId?: string;
  type: 'vaccination_drive' | 'movement_restriction' | 'quarantine' | 'culling' | 'awareness' | 'surveillance';
  orderedByUserId: string;
  orderedBy?: string;          // alias for backwards compatibility
  orderedAt: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  description: string;
  affectedVillages?: string[];
  targetAnimalCount?: number;
}

// ----------------------------------------------------------------
// Backwards Compatibility Aliases for UI Components
// ----------------------------------------------------------------

export type GeoLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  village?: string;
  block?: string;
  district: string;
  state: string;
};

export type IncidentReport = {
  id: string;
  reportedBy: string;
  reporterRole: UserRole;
  createdAt: string;
  updatedAt: string;
  species: AnimalSpecies;
  breedDescription?: string;
  totalAnimals: number;
  affectedAnimals: number;
  deadAnimals: number;
  symptomIds: string[];
  onsetDate: string;
  durationDays: number;
  additionalNotes?: string;
  location: GeoLocation;
  isVaccinated: boolean;
  lastVaccinationDate?: string;
  vaccineNames?: string;
  status: CaseStatus;
  offlinePending?: boolean;
};

export type TriageResult = RiskAssessment & {
  incidentId: string;
};

export type VetAssessment = {
  vetId: string;
  assessedAt: string;
  clinicalFindings: string;
  agreedWithAiRisk: boolean;
  revisedRiskBand?: RiskBand;
  clinicalDiagnosis?: string;
  requiresSample: boolean;
  treatmentRecommended?: string;
  quarantineRecommended: boolean;
  notes?: string;
};

export type SampleCollection = Sample & {
  sampleId: string;
  collectedBy: string;
  destinationLab: string;
  animalCount: number;
};

export type ContainmentAction = ResponseAction;

export type TimelineEvent = {
  id: string;
  caseId: string;
  timestamp: string;
  eventType: string;
  actorId: string;
  actorRole: UserRole;
  summary: string;
  details?: string;
};

export type CaseRecord = {
  id: string;                 // Canonical Case ID e.g. LV-2026-00001
  incidentReport: IncidentReport;
  triageResult?: TriageResult;
  assignedVetId?: string;
  vetAssessment?: VetAssessment;
  sampleCollection?: SampleCollection;
  labResult?: LabResult;
  containmentActions?: ContainmentAction[];
  timeline: TimelineEvent[];
};

export type DashboardStats = {
  totalActiveCases: number;
  highRiskCases: number;
  labPendingResults: number;
  confirmedOutbreaks: number;
  casesLast7Days: number[];
  speciesBreakdown: { species: AnimalSpecies; count: number }[];
  districtHotspots: { district: string; count: number; riskBand: RiskBand }[];
  isSynthetic: boolean;
};

export type AppNotification = Alert;
