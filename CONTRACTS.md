# Livestock Sentinel — Shared Contract Reference
**Member 1 — Platform Core & Integration Layer**  
*Last updated: 2026-08-27*

> [!IMPORTANT]
> **Domain Safety Rule**: This system performs **surveillance, risk scoring and triage only**. It is NOT an autonomous veterinary diagnostic system. All AI output carries a mandatory disclaimer. Definitive disease confirmation requires a veterinarian or laboratory result.

---

## Quick Import Reference

```typescript
// Core types — import from here ALWAYS. Do not create your own versions.
import type {
  HealthCase, CaseStatus, RiskBand,
  CaseEvent, CaseEventType,
  Evidence, EvidenceType,
  RiskAssessment, RiskFactor,
  VaccinationCoverage,
  MovementRoute,
  Alert, AlertType,
  SyncMetadata, SyncStatus,
  AuditEvent,
  GeoLocation,
  User, UserRole,
  AnimalSpecies, SuspectedDisease,
  CaseRecord, IncidentReport, TriageResult,
} from '../types';

// Case CRUD + Triage + Sample + Lab + Cluster + Alerts
import {
  createCase, getCases, getCaseById,
  submitRiskAssessment,
  assignVeterinarian, recordFieldVisit,
  createSample, updateSample,
  submitLabResult,
  retrieveAlerts, retrieveClusters,
  createResponseAction,
} from '../services/api';

// Event timeline, Evidence, VaccinationCoverage, MovementRoute, AuditTrail, Sync
import {
  addCaseEvent, getCaseEvents,
  addEvidence, getEvidenceForCase,
  getVaccinationCoverage, upsertVaccinationCoverage,
  getMovementRoutes, addMovementRoute,
  createAlert,
  recordAuditEvent, getAuditLog,
  buildSyncMetadata, markSynced, markSyncFailed,
} from '../services/platform';

// External adapter mocks (NADRES/INAPH/Weather/Lab)
import {
  mockDiseaseIntelligenceAdapter,
  mockAnimalRegistryAdapter,
  mockWeatherAdapter,
  mockLabAdapter,
} from '../services/adapters';
```

---

## Canonical Case ID

Format: `LV-YYYY-XXXXX`  
Example: `LV-2026-00001`

```typescript
import { generateCanonicalCaseId } from '../types';
const caseId = generateCanonicalCaseId(1, 2026); // "LV-2026-00001"
```

---

## Core Models Reference

### `HealthCase`
Master record for a disease incident. **Never create a local copy of this.**

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Canonical Case ID `LV-2026-XXXXX` |
| `status` | `CaseStatus` | 14-step lifecycle from `reported` → `closed` |
| `riskBand` | `RiskBand` | `low` / `moderate` / `high` / `critical` |
| `syndromeCategory` | `string?` | AI/field presentation (non-definitive) |
| `suspectedDisease` | `SuspectedDisease?` | AI suspicion only |
| `confirmedDisease` | `SuspectedDisease?` | **Definitive — Lab/Vet only** |
| `latitude`, `longitude` | `number` | GPS coordinates |
| `village`, `gramPanchayat`, `block`, `district`, `state` | `string` | Geographic hierarchy |

### `GeoLocation`
```typescript
{
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
```
Designed to be PostGIS-compatible without frontend contract changes.

### `Evidence`
Multimodal evidence attached to a case.
```typescript
{
  id: string;
  caseId: string;              // Canonical Case ID
  type: EvidenceType;          // TEXT | VOICE | IMAGE | FIELD_OBSERVATION | VACCINATION | ENVIRONMENTAL | MOVEMENT
  source: string;              // e.g. "farmer_app"
  uri?: string;                // Blob/Storage URL for audio/image
  transcript?: string;         // Voice transcription if applicable
  metadata?: Record<string, any>;
  createdAt: string;
  syncMetadata?: SyncMetadata;
}
```

### `RiskAssessment`
AI triage output. **Always non-definitive.**
```typescript
{
  id: string;
  caseId: string;
  riskScore: number;           // 0–100
  riskBand: RiskBand;
  syndromeCategory?: string;   // e.g. "Vesicular Disease Pattern"
  suspectedDisease?: SuspectedDisease;   // NON-DEFINITIVE
  factors: RiskFactor[];       // See below
  modelVersion: string;
  requiresVeterinaryAssessment?: boolean;  // Always true
  recommendation: string;
  disclaimer: string;          // Mandatory safety text
}
```

### `RiskFactor` (Explainability)
```typescript
{
  factorName: string;          // e.g. "Cluster Proximity"
  contribution: number;        // 0–100 weight
  evidence: string;            // e.g. "2 active cases within 3km"
  source: string;              // e.g. "spatial_engine"
  timestamp?: string;
  direction: 'risk' | 'protective';
}
```

### `VaccinationCoverage`
Village/block/district level vaccination gap data.
```typescript
{
  id: string;
  district: string;
  block: string;
  village?: string;
  species: AnimalSpecies;
  eligibleAnimalCount: number;
  vaccinatedAnimalCount: number;
  coveragePercentage: number;          // Computed: (vaccinated/eligible)*100
  riskThresholdPercentage?: number;    // Configurable (default 75, NOT hard-coded)
  isVulnerable?: boolean;
  campaignDate?: string;
  vaccineType: string;
  source: string;
}
```

### `MovementRoute`
Livestock trade/movement network node.
```typescript
{
  id: string;
  marketNodeName: string;
  sourceLocation: GeoLocation;
  destinationLocation: GeoLocation;
  routeType: 'interstate' | 'interdistrict' | 'local_market' | 'transhumance';
  estimatedMovementVolume: number;   // Head count per timePeriod
  timePeriod: string;               // e.g. "weekly"
  confidence: 'high' | 'medium' | 'low';
  source: string;
  riskLevel?: RiskBand;
}
```

### `CaseEvent`
Immutable event log for a case timeline.
```typescript
{
  id: string;
  caseId: string;
  actorUserId?: string;
  actorRole: UserRole;
  eventType: CaseEventType;          // 16 standard event types
  timestamp: string;
  summary: string;
  metadata?: Record<string, any>;
}
```

### `Alert`
Standardized notification model.
```typescript
{
  id: string;
  alertType?: AlertType;    // HIGH_RISK_CASE | EMERGING_CLUSTER | POSITIVE_LAB_RESULT | VACCINATION_GAP | RESPONSE_DELAY | SYMPTOM_SPIKE | MOVEMENT_RISK
  caseId?: string;
  clusterId?: string;
  severity: NotificationSeverity;    // info | warning | danger | success | critical
  title: string;
  message: string;
  targetRoles?: UserRole[];
  targetDistrict?: string;
  location?: GeoLocation;
  isRead: boolean;
  createdAt: string;
}
```

### `SyncMetadata`
Optional field on any record for offline sync support.
```typescript
{
  localId?: string;
  serverId?: string;
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  createdOffline: boolean;
  lastSyncedAt?: string;
  syncAttempts?: number;
}
```

---

## Member Integration Guide

### Member 2 — Farmer / Field Reporting
```typescript
// 1. Create a case
const { caseId, record } = await createCase({ ... });

// 2. Add text/voice/image evidence
await addEvidence({ caseId, type: 'VOICE', source: 'farmer_app', uri: blobUrl });
await addEvidence({ caseId, type: 'IMAGE', source: 'farmer_app', uri: imageUrl });

// 3. For offline-created records, use SyncMetadata
const meta = buildSyncMetadata({ localId: 'local-123', createdOffline: true });
```

### Member 3 — Veterinarian Console
```typescript
// Assign vet to case
await assignVeterinarian(caseId, vetUserId, assignedByUserId);

// Record field visit (clinical diagnosis allowed here)
await recordFieldVisit({ caseId, clinicalDiagnosis: 'FMD', ... });

// Order sample
await createSample({ caseId, sampleType: 'Blood Serum', ... });
```

### Member 4 — AI Risk Triage Engine
```typescript
// Submit risk assessment (auto-injects requiresVeterinaryAssessment: true)
await submitRiskAssessment({
  caseId,
  riskScore: 78,
  riskBand: 'high',
  syndromeCategory: 'Vesicular Disease Pattern',
  factors: [
    { factorName: 'Cluster Proximity', contribution: 35, evidence: '2 cases in 3km', source: 'spatial_engine', direction: 'risk' },
  ],
  recommendation: 'Veterinary escalation recommended.',
  disclaimer: '...', // Will be overridden by platform safety default
  modelVersion: 'sentinel-v2',
  isSynthetic: false,
  computedAt: new Date().toISOString(),
});
```

### Member 5 — Government GIS & Outbreak
```typescript
// Get clusters
const clusters = await retrieveClusters('Nashik');

// Get movement routes for risk overlay
const routes = await getMovementRoutes({ district: 'Nashik', riskLevel: 'moderate' });

// Get vaccination vulnerability map
const coverage = await getVaccinationCoverage({ district: 'Nashik', riskThreshold: 70 });
```

### Member 6 — Lab Tracker & Alerts
```typescript
// Update sample chain of custody
await updateSample(sampleId, 'Lab Received', labUserId, 'Cold chain intact');

// Submit definitive lab result
await submitLabResult({ caseId, sampleId, testName: 'RT-PCR FMD', status: 'positive', pathogenConfirmed: 'FMDV', serotype: 'Type O', ... });

// Create typed alert
await createAlert({
  alertType: 'POSITIVE_LAB_RESULT',
  caseId,
  severity: 'critical',
  title: 'Lab Positive: FMD Confirmed',
  message: 'FMDV Type O confirmed for case LV-2026-00001',
  targetRoles: ['government_officer', 'veterinarian'],
  targetDistrict: 'Nashik',
});

// Retrieve alerts for role-based inbox
const alerts = await retrieveAlerts('Nashik');
```

---

## Database Tables (21 total)

| # | Table | Purpose |
|---|---|---|
| 1 | `users` | User accounts |
| 2 | `farms_or_herds` | Farm registry |
| 3 | `animals` | Individual animal records |
| 4 | `health_cases` | Master case record (Canonical ID) |
| 5 | `symptom_reports` | Symptom submissions |
| 6 | `vaccination_records` | Per-animal vaccination events |
| 7 | `treatment_records` | Medication/treatment history |
| 8 | `risk_assessments` | AI triage output (non-definitive) |
| 9 | `outbreak_clusters` | Spatio-temporal cluster detection |
| 10 | `vet_assignments` | Veterinary case assignments |
| 11 | `field_visits` | Vet clinical assessments |
| 12 | `samples` | Sample collection + chain of custody |
| 13 | `lab_results` | **Definitive** diagnostic outcomes |
| 14 | `alerts` | Notifications |
| 15 | `advisories` | Public health advisories |
| 16 | `response_actions` | Containment orders |
| 17 | `case_events` | ⬆️ NEW: Event-driven case timeline |
| 18 | `evidence` | ⬆️ NEW: Multimodal evidence store |
| 19 | `vaccination_coverage` | ⬆️ NEW: Village-level coverage gaps |
| 20 | `movement_routes` | ⬆️ NEW: Livestock trade network |
| 21 | `audit_events` | ⬆️ NEW: Audit trail |

---

> [!WARNING]
> **Do NOT** create local type aliases for `HealthCase`, `RiskAssessment`, `Evidence`, `CaseEvent`, `Alert`, or `VaccinationCoverage`. Import from `../types` directly to maintain cross-member compatibility.

> [!NOTE]
> **Offline**: Use `buildSyncMetadata()` from `platform.ts` to attach sync metadata to records created offline. The actual IndexedDB queue is owned by the offline module — this only provides the metadata shape.
