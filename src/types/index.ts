// ============================================================
// LIVESTOCK SENTINEL — Core Type Definitions
// ============================================================

export type UserRole =
  | 'farmer'
  | 'paravet'
  | 'veterinarian'
  | 'lab_tech'
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
  avatarInitials: string;
}

// ----------------------------------------------------------------
// Risk & Status
// ----------------------------------------------------------------

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

// ----------------------------------------------------------------
// Animal & Disease
// ----------------------------------------------------------------

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
// Incident Report (Farmer/Paravet submission)
// ----------------------------------------------------------------

export interface Symptom {
  id: string;
  label: string;
  category: 'general' | 'respiratory' | 'digestive' | 'skin' | 'neurological' | 'reproductive';
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  village?: string;
  block?: string;
  district: string;
  state: string;
}

export interface IncidentReport {
  id: string;
  reportedBy: string;        // user id
  reporterRole: UserRole;
  createdAt: string;         // ISO string
  updatedAt: string;

  // Animal details
  species: AnimalSpecies;
  breedDescription?: string;
  totalAnimals: number;
  affectedAnimals: number;
  deadAnimals: number;

  // Symptoms
  symptomIds: string[];
  onsetDate: string;         // ISO date
  durationDays: number;
  additionalNotes?: string;

  // Location
  location: GeoLocation;

  // Vaccination
  isVaccinated: boolean;
  lastVaccinationDate?: string;
  vaccineNames?: string;

  // Status
  status: CaseStatus;
  offlinePending?: boolean;  // queued for sync
}

// ----------------------------------------------------------------
// AI Triage Result
// ----------------------------------------------------------------

export interface TriageFactor {
  label: string;
  value: string;
  weight: number;            // 0-100 contribution to score
  direction: 'risk' | 'protective';
}

export interface TriageResult {
  incidentId: string;
  computedAt: string;
  riskScore: number;         // 0-100
  riskBand: RiskBand;
  suspectedDisease?: SuspectedDisease;
  factors: TriageFactor[];
  recommendation: string;
  disclaimer: string;
  modelVersion: string;
  isSynthetic: boolean;
}

// ----------------------------------------------------------------
// Case (full lifecycle)
// ----------------------------------------------------------------

export interface CaseRecord {
  id: string;
  incidentReport: IncidentReport;
  triageResult?: TriageResult;
  assignedVetId?: string;
  vetAssessment?: VetAssessment;
  sampleCollection?: SampleCollection;
  labResult?: LabResult;
  containmentActions?: ContainmentAction[];
  timeline: TimelineEvent[];
}

// ----------------------------------------------------------------
// Veterinary Assessment
// ----------------------------------------------------------------

export interface VetAssessment {
  vetId: string;
  assessedAt: string;
  clinicalFindings: string;
  agreedWithAiRisk: boolean;
  revisedRiskBand?: RiskBand;
  clinicalDiagnosis?: string;          // "Suspected FMD" etc.
  requiresSample: boolean;
  treatmentRecommended?: string;
  quarantineRecommended: boolean;
  notes?: string;
}

// ----------------------------------------------------------------
// Sample & Lab
// ----------------------------------------------------------------

export interface SampleCollection {
  sampleId: string;
  collectedBy: string;       // user id
  collectedAt: string;
  sampleType: string;        // "Blood serum", "Nasal swab", etc.
  animalCount: number;
  barcode: string;
  destinationLab: string;
  dispatchedAt?: string;
  receivedAt?: string;
  chainOfCustody: ChainStep[];
}

export interface ChainStep {
  step: string;
  timestamp: string;
  handledBy: string;
  notes?: string;
}

export interface LabResult {
  sampleId: string;
  labId: string;
  techId: string;
  resultEnteredAt: string;
  testName: string;
  status: LabResultStatus;
  pathogen?: string;
  serotype?: string;
  notes?: string;
  confirmedDisease?: SuspectedDisease;
}

// ----------------------------------------------------------------
// Containment & Government Actions
// ----------------------------------------------------------------

export interface ContainmentAction {
  id: string;
  caseId: string;
  type: 'vaccination_drive' | 'movement_restriction' | 'quarantine' | 'culling' | 'awareness' | 'surveillance';
  orderedBy: string;
  orderedAt: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  description: string;
  affectedVillages?: string[];
}

// ----------------------------------------------------------------
// Timeline Events
// ----------------------------------------------------------------

export interface TimelineEvent {
  id: string;
  caseId: string;
  timestamp: string;
  eventType: string;
  actorId: string;
  actorRole: UserRole;
  summary: string;
  details?: string;
}

// ----------------------------------------------------------------
// Dashboard Stats
// ----------------------------------------------------------------

export interface DashboardStats {
  totalActiveCases: number;
  highRiskCases: number;
  labPendingResults: number;
  confirmedOutbreaks: number;
  casesLast7Days: number[];
  speciesBreakdown: { species: AnimalSpecies; count: number }[];
  districtHotspots: { district: string; count: number; riskBand: RiskBand }[];
  isSynthetic: boolean;
}

// ----------------------------------------------------------------
// Notification
// ----------------------------------------------------------------

export type NotificationSeverity = 'info' | 'warning' | 'danger' | 'success' | 'critical';

export interface AppNotification {
  id: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  targetRoles?: UserRole[];
  caseId?: string;
  actionLabel?: string;
  actionPath?: string;
}
