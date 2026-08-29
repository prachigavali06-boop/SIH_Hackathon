// ============================================================
// LIVESTOCK SENTINEL — Shared Core Data Models & API Contracts
// Member 1 — Platform Core & Integration Layer Foundation
// Pre-Merge Safety Compliant: Triage & Risk Scoring (No Autonomous Diagnosis)
// ============================================================

// ----------------------------------------------------------------
// 1. Roles & Access Control
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
// 2. Canonical Case ID Standardizer
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
// 3. Offline Synchronization Metadata Model (Task 8)
// ----------------------------------------------------------------

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';

export interface SyncMetadata {
  localId?: string;
  serverId?: string;
  syncStatus: SyncStatus;
  createdOffline: boolean;
  lastSyncedAt?: string;
  syncAttempts?: number;
  conflictDetails?: string;
}

// ----------------------------------------------------------------
// 4. Geolocation Model (Task 3)
// ----------------------------------------------------------------

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  village: string;
  gramPanchayat?: string;
  block: string;
  district: string;
  state: string;
  pincode?: string;
}

// ----------------------------------------------------------------
// 5. Core Domain Entities
// ----------------------------------------------------------------

// Animal
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

// Farm / Herd
export interface FarmOrHerd {
  id: string;
  ownerFarmerId: string;
  farmName?: string;
  village: string;
  gramPanchayat?: string;
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

// HealthCase (Master Record linked via Canonical Case ID)
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
  gramPanchayat?: string;
  block: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  syndromeCategory?: string;           // Non-definitive AI/field syndrome
  suspectedDisease?: SuspectedDisease;  // Non-definitive AI suspicion
  confirmedDisease?: SuspectedDisease;  // DEFINITIVE: Populated ONLY by Vet/Lab workflow
  assignedVetUserId?: string;
  assignedLabUserId?: string;
  createdAt: string;
  updatedAt: string;
  syncMetadata?: SyncMetadata;
}

// SymptomReport
export interface Symptom {
  id: string;
  label: string;
  labelHi?: string;
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
  syncMetadata?: SyncMetadata;
}

// ----------------------------------------------------------------
// 6. Multimodal Evidence Model (Task 2)
// ----------------------------------------------------------------

export type EvidenceType =
  | 'TEXT'
  | 'VOICE'
  | 'IMAGE'
  | 'FIELD_OBSERVATION'
  | 'VACCINATION'
  | 'ENVIRONMENTAL'
  | 'MOVEMENT';

export interface Evidence {
  id: string;
  caseId: string;             // Canonical Case ID
  type: EvidenceType;
  source: string;             // e.g. "farmer_app", "vet_mobile", "sat_weather"
  uri?: string;               // Audio file URL or image blob reference
  transcript?: string;        // Voice note transcription if applicable
  metadata?: Record<string, any>;
  createdAt: string;
  syncMetadata?: SyncMetadata;
}

// ----------------------------------------------------------------
// 7. Event-Driven Case Timeline Model (Task 1)
// ----------------------------------------------------------------

export type CaseEventType =
  | 'CASE_CREATED'
  | 'SYMPTOMS_REPORTED'
  | 'VOICE_ADDED'
  | 'IMAGE_ADDED'
  | 'RISK_ASSESSED'
  | 'CLUSTER_DETECTED'
  | 'VET_ASSIGNED'
  | 'FIELD_VISIT_COMPLETED'
  | 'SAMPLE_COLLECTED'
  | 'SAMPLE_DISPATCHED'
  | 'LAB_RECEIVED'
  | 'LAB_RESULT_UPDATED'
  | 'ALERT_SENT'
  | 'RESPONSE_STARTED'
  | 'CASE_CONTAINED'
  | 'CASE_CLOSED';

export interface CaseEvent {
  id: string;
  caseId: string;             // Canonical Case ID
  actorUserId?: string;
  actorRole: UserRole;
  eventType: CaseEventType;
  timestamp: string;
  summary: string;
  metadata?: Record<string, any>;
}

// ----------------------------------------------------------------
// 8. Vaccination & Treatment Models (Task 4)
// ----------------------------------------------------------------

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

export interface VaccinationCoverage {
  id: string;
  district: string;
  block: string;
  village?: string;
  species: AnimalSpecies;
  eligibleAnimalCount: number;
  vaccinatedAnimalCount: number;
  coveragePercentage: number;          // (vaccinated / eligible) * 100
  riskThresholdPercentage?: number;     // Configurable threshold (e.g. 75%)
  isVulnerable?: boolean;              // coveragePercentage < riskThresholdPercentage
  campaignDate?: string;
  vaccineType: string;
  source: string;
  updatedAt: string;
}

export interface TreatmentRecord {
  id: string;
  caseId: string;             // Canonical Case ID
  prescribedByVetId: string;
  medicationName: string;
  dosage?: string;
  instructions?: string;
  administeredAt: string;
}

// ----------------------------------------------------------------
// 9. Risk Factor & Assessment Model (Task 6)
// ----------------------------------------------------------------

export interface RiskFactor {
  // New explainability fields (preferred for new implementations)
  factorName?: string;        // e.g. "Cluster Proximity", "Vaccination Gap"
  contribution?: number;      // 0 - 100 contribution weight
  evidence?: string;          // Evidence string (descriptive)
  source?: string;            // e.g. "spatial_engine", "herd_history"
  timestamp?: string;
  direction: 'risk' | 'protective';
  // Backwards-compatible aliases (existing seed data + AIExplanationPanel)
  label?: string;             // alias for factorName
  value?: string;             // alias for evidence
  weight?: number;            // alias for contribution
}

// Backwards-compatible alias
export type TriageFactor = RiskFactor;

export interface RiskAssessment {
  id: string;
  caseId: string;                      // Canonical Case ID
  riskScore: number;                   // 0 - 100
  riskBand: RiskBand;
  syndromeCategory?: string;           // e.g. "Vesicular Disease Pattern"
  suspectedDisease?: SuspectedDisease; // NON-DEFINITIVE AI suspicion
  factors: RiskFactor[];               // Contributing factors
  modelVersion: string;
  requiresVeterinaryAssessment?: boolean; // Default true (Safety rule)
  recommendation: string;
  disclaimer: string;
  isSynthetic: boolean;
  computedAt: string;
  syncMetadata?: SyncMetadata;
}

// ----------------------------------------------------------------
// 10. Spatial Outbreak & Livestock Movement Models (Task 5)
// ----------------------------------------------------------------

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

export interface MovementRoute {
  id: string;
  marketNodeName: string;
  sourceLocation: GeoLocation;
  destinationLocation: GeoLocation;
  routeType: 'interstate' | 'interdistrict' | 'local_market' | 'transhumance';
  estimatedMovementVolume: number;     // Head count per time frame
  timePeriod: string;                  // e.g. "weekly", "monthly"
  confidence: 'high' | 'medium' | 'low';
  source: string;
  riskLevel?: RiskBand;
  createdAt: string;
}

// ----------------------------------------------------------------
// 11. Veterinary, Field Visit & Sample Models
// ----------------------------------------------------------------

export interface VetAssignment {
  id: string;
  caseId: string;             // Canonical Case ID
  assignedVetUserId: string;
  assignedByUserId: string;
  assignedAt: string;
  status: 'pending' | 'accepted' | 'completed' | 'reassigned';
  notes?: string;
}

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

// ----------------------------------------------------------------
// 12. Alert Event Model (Task 7)
// ----------------------------------------------------------------

export type NotificationSeverity = 'info' | 'warning' | 'danger' | 'success' | 'critical';

export type AlertType =
  | 'HIGH_RISK_CASE'
  | 'EMERGING_CLUSTER'
  | 'POSITIVE_LAB_RESULT'
  | 'VACCINATION_GAP'
  | 'RESPONSE_DELAY'
  | 'SYMPTOM_SPIKE'
  | 'MOVEMENT_RISK';

export interface Alert {
  id: string;
  alertType?: AlertType;
  caseId?: string;            // Canonical Case ID
  clusterId?: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  targetRoles?: UserRole[];
  targetDistrict?: string;
  location?: GeoLocation;
  isRead: boolean;
  actionPath?: string;
  actionLabel?: string;
  createdAt: string;
  timestamp?: string;          // alias for backwards compatibility
}

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

// ----------------------------------------------------------------
// 13. Response Actions & Audit Trail (Task 10)
// ----------------------------------------------------------------

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

export interface AuditEvent {
  id: string;
  entityType: 'case' | 'sample' | 'alert' | 'user' | 'evidence' | 'containment';
  entityId: string;
  action: string;             // e.g. "REPORT_SUBMITTED", "AI_TRIAGED", "VET_ASSIGNED"
  actorUserId: string;
  actorRole: UserRole;
  timestamp: string;
  details?: string;           // Privacy safe non-sensitive summary
}

// ----------------------------------------------------------------
// Backwards Compatibility Aliases for UI Components
// ----------------------------------------------------------------

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
  evidences?: Evidence[];
  caseEvents?: CaseEvent[];
  syncMetadata?: SyncMetadata;
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
