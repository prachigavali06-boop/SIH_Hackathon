// ============================================================
// LIVESTOCK SENTINEL — Extended Service & API Contracts Layer
// Member 1 — Platform Core & Integration Layer
// Extension of api.ts: New contracts for CaseEvent, Evidence,
// VaccinationCoverage, MovementRoute, AuditEvent services
// ============================================================

import { supabase, isSupabaseConfigured } from './supabase';
import { useNotificationStore } from '../store/notificationStore';
import type {
  CaseEvent, CaseEventType,
  Evidence, EvidenceType,
  VaccinationCoverage,
  MovementRoute,
  AuditEvent,
  Alert, AlertType, NotificationSeverity,
  UserRole, GeoLocation, AnimalSpecies,
  SyncMetadata, SyncStatus,
} from '../types';

const AUDIT_LOG: AuditEvent[] = [];
const CASE_EVENTS_STORE: CaseEvent[] = [];
const EVIDENCE_STORE: Evidence[] = [];
const VACCINATION_COVERAGE_STORE: VaccinationCoverage[] = [
  {
    id: 'vc-nashik-cattle-01',
    district: 'Nashik',
    block: 'Niphad',
    village: 'Chandori',
    species: 'cattle',
    eligibleAnimalCount: 850,
    vaccinatedAnimalCount: 552,
    coveragePercentage: 64.9,
    riskThresholdPercentage: 75,
    isVulnerable: true,
    campaignDate: '2026-03-15',
    vaccineType: 'FMD Type O + A Bivalent',
    source: 'Block Veterinary Officer, Niphad',
    updatedAt: '2026-03-20T10:00:00Z',
  },
  {
    id: 'vc-nashik-buffalo-01',
    district: 'Nashik',
    block: 'Yeola',
    species: 'buffalo',
    eligibleAnimalCount: 430,
    vaccinatedAnimalCount: 387,
    coveragePercentage: 90.0,
    riskThresholdPercentage: 75,
    isVulnerable: false,
    campaignDate: '2026-04-01',
    vaccineType: 'FMD Trivalent',
    source: 'District Animal Husbandry Dept, Nashik',
    updatedAt: '2026-04-05T08:00:00Z',
  },
];
const MOVEMENT_ROUTES_STORE: MovementRoute[] = [
  {
    id: 'mr-niphad-manmad-01',
    marketNodeName: 'Manmad Livestock Market',
    sourceLocation: {
      latitude: 20.0059,
      longitude: 73.793,
      village: 'Chandori',
      block: 'Niphad',
      district: 'Nashik',
      state: 'Maharashtra',
    },
    destinationLocation: {
      latitude: 20.265,
      longitude: 74.433,
      village: 'Manmad',
      block: 'Nandgaon',
      district: 'Nashik',
      state: 'Maharashtra',
    },
    routeType: 'interdistrict',
    estimatedMovementVolume: 150,
    timePeriod: 'weekly',
    confidence: 'medium',
    source: 'District Survey (Synthetic)',
    riskLevel: 'moderate',
    createdAt: '2026-08-01T00:00:00Z',
  },
];

// ----------------------------------------------------------------
// SERVICE 1: Case Event Timeline
// ----------------------------------------------------------------

export async function addCaseEvent(params: {
  caseId: string;
  actorUserId?: string;
  actorRole: UserRole;
  eventType: CaseEventType;
  summary: string;
  metadata?: Record<string, any>;
}): Promise<CaseEvent> {
  const event: CaseEvent = {
    id: `ev-${params.caseId}-${Date.now()}`,
    caseId: params.caseId,
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    eventType: params.eventType,
    timestamp: new Date().toISOString(),
    summary: params.summary,
    metadata: params.metadata,
  };

  CASE_EVENTS_STORE.push(event);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('case_events').insert({
        id: event.id,
        case_id: event.caseId,
        actor_user_id: event.actorUserId,
        actor_role: event.actorRole,
        event_type: event.eventType,
        timestamp: event.timestamp,
        summary: event.summary,
        metadata: event.metadata,
      });
    } catch (err) {
      console.warn('Supabase addCaseEvent fallback:', err);
    }
  }

  return event;
}

export async function getCaseEvents(caseId: string): Promise<CaseEvent[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('case_events')
        .select('*')
        .eq('case_id', caseId)
        .order('timestamp', { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map(r => ({
          id: r.id,
          caseId: r.case_id,
          actorUserId: r.actor_user_id,
          actorRole: r.actor_role,
          eventType: r.event_type,
          timestamp: r.timestamp,
          summary: r.summary,
          metadata: r.metadata,
        }));
      }
    } catch (err) {
      console.warn('Supabase getCaseEvents fallback:', err);
    }
  }

  return CASE_EVENTS_STORE.filter(e => e.caseId === caseId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// ----------------------------------------------------------------
// SERVICE 2: Multimodal Evidence
// ----------------------------------------------------------------

export async function addEvidence(params: {
  caseId: string;
  type: EvidenceType;
  source: string;
  uri?: string;
  transcript?: string;
  metadata?: Record<string, any>;
}): Promise<Evidence> {
  const ev: Evidence = {
    id: `evd-${params.caseId}-${Date.now()}`,
    caseId: params.caseId,
    type: params.type,
    source: params.source,
    uri: params.uri,
    transcript: params.transcript,
    metadata: params.metadata,
    createdAt: new Date().toISOString(),
    syncMetadata: { syncStatus: 'SYNCED', createdOffline: false },
  };

  EVIDENCE_STORE.push(ev);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('evidence').insert({
        id: ev.id,
        case_id: ev.caseId,
        type: ev.type,
        source: ev.source,
        uri: ev.uri,
        transcript: ev.transcript,
        metadata: ev.metadata,
        created_at: ev.createdAt,
      });
    } catch (err) {
      console.warn('Supabase addEvidence fallback:', err);
    }
  }

  // Emit a timeline event when evidence is added
  const eventType: CaseEventType =
    params.type === 'VOICE' ? 'VOICE_ADDED' :
    params.type === 'IMAGE' ? 'IMAGE_ADDED' :
    'SYMPTOMS_REPORTED';

  await addCaseEvent({
    caseId: params.caseId,
    actorRole: 'farmer',
    eventType,
    summary: `${params.type} evidence attached from ${params.source}`,
  });

  return ev;
}

export async function getEvidenceForCase(caseId: string): Promise<Evidence[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('evidence')
        .select('*')
        .eq('case_id', caseId);
      if (!error && data && data.length > 0) {
        return data.map(r => ({
          id: r.id,
          caseId: r.case_id,
          type: r.type,
          source: r.source,
          uri: r.uri,
          transcript: r.transcript,
          metadata: r.metadata,
          createdAt: r.created_at,
        }));
      }
    } catch (err) {
      console.warn('Supabase getEvidenceForCase fallback:', err);
    }
  }
  return EVIDENCE_STORE.filter(e => e.caseId === caseId);
}

// ----------------------------------------------------------------
// SERVICE 3: Vaccination Coverage
// ----------------------------------------------------------------

export async function getVaccinationCoverage(params: {
  district?: string;
  block?: string;
  village?: string;
  species?: AnimalSpecies;
  riskThreshold?: number;
}): Promise<VaccinationCoverage[]> {
  let result = [...VACCINATION_COVERAGE_STORE];

  if (params.district) result = result.filter(v => v.district === params.district);
  if (params.block) result = result.filter(v => v.block === params.block);
  if (params.village) result = result.filter(v => v.village === params.village);
  if (params.species) result = result.filter(v => v.species === params.species);

  // Apply configurable risk threshold if provided
  if (params.riskThreshold !== undefined) {
    result = result.map(v => ({
      ...v,
      riskThresholdPercentage: params.riskThreshold,
      isVulnerable: v.coveragePercentage < (params.riskThreshold ?? v.riskThresholdPercentage ?? 75),
    }));
  }

  return result;
}

export async function upsertVaccinationCoverage(coverage: VaccinationCoverage): Promise<VaccinationCoverage> {
  const idx = VACCINATION_COVERAGE_STORE.findIndex(v => v.id === coverage.id);
  const updated = { ...coverage, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    VACCINATION_COVERAGE_STORE[idx] = updated;
  } else {
    VACCINATION_COVERAGE_STORE.push(updated);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('vaccination_coverage').upsert({
        id: updated.id,
        district: updated.district,
        block: updated.block,
        village: updated.village,
        species: updated.species,
        eligible_animal_count: updated.eligibleAnimalCount,
        vaccinated_animal_count: updated.vaccinatedAnimalCount,
        coverage_percentage: updated.coveragePercentage,
        risk_threshold_percentage: updated.riskThresholdPercentage,
        is_vulnerable: updated.isVulnerable,
        campaign_date: updated.campaignDate,
        vaccine_type: updated.vaccineType,
        source: updated.source,
        updated_at: updated.updatedAt,
      });
    } catch (err) {
      console.warn('Supabase upsertVaccinationCoverage fallback:', err);
    }
  }

  return updated;
}

// ----------------------------------------------------------------
// SERVICE 4: Movement Routes (Livestock Trade Network)
// ----------------------------------------------------------------

export async function getMovementRoutes(params?: {
  district?: string;
  riskLevel?: string;
}): Promise<MovementRoute[]> {
  let result = [...MOVEMENT_ROUTES_STORE];
  if (params?.district) {
    result = result.filter(
      r => r.sourceLocation.district === params.district ||
           r.destinationLocation.district === params.district
    );
  }
  if (params?.riskLevel) {
    result = result.filter(r => r.riskLevel === params.riskLevel);
  }
  return result;
}

export async function addMovementRoute(route: Omit<MovementRoute, 'id' | 'createdAt'>): Promise<MovementRoute> {
  const newRoute: MovementRoute = {
    ...route,
    id: `mr-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  MOVEMENT_ROUTES_STORE.push(newRoute);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('movement_routes').insert({
        id: newRoute.id,
        market_node_name: newRoute.marketNodeName,
        source_location: newRoute.sourceLocation,
        destination_location: newRoute.destinationLocation,
        route_type: newRoute.routeType,
        estimated_movement_volume: newRoute.estimatedMovementVolume,
        time_period: newRoute.timePeriod,
        confidence: newRoute.confidence,
        source: newRoute.source,
        risk_level: newRoute.riskLevel,
        created_at: newRoute.createdAt,
      });
    } catch (err) {
      console.warn('Supabase addMovementRoute fallback:', err);
    }
  }

  return newRoute;
}

// ----------------------------------------------------------------
// SERVICE 5: Alert Management (Extended)
// ----------------------------------------------------------------

export async function createAlert(params: {
  alertType: AlertType;
  caseId?: string;
  clusterId?: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  targetRoles?: UserRole[];
  targetDistrict?: string;
  location?: GeoLocation;
  actionPath?: string;
  actionLabel?: string;
}): Promise<Alert> {
  const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const now = new Date().toISOString();
  const alert: Alert = {
    id: alertId,
    alertType: params.alertType,
    caseId: params.caseId,
    clusterId: params.clusterId,
    severity: params.severity,
    title: params.title,
    message: params.message,
    targetRoles: params.targetRoles,
    targetDistrict: params.targetDistrict,
    location: params.location,
    isRead: false,
    actionPath: params.actionPath,
    actionLabel: params.actionLabel,
    createdAt: now,
    timestamp: now,
  };

  // Persist directly into the shared notification store (persisted in localStorage)
  useNotificationStore.getState().addNotification(alert);

  if (params.caseId) {
    await addCaseEvent({
      caseId: params.caseId,
      actorRole: 'admin',
      eventType: 'ALERT_SENT',
      summary: `Alert sent: ${params.title}`,
      metadata: { alertType: params.alertType, severity: params.severity },
    });
  }

  return alert;
}

// ----------------------------------------------------------------
// SERVICE 6: Audit Trail
// ----------------------------------------------------------------

export async function recordAuditEvent(params: {
  entityType: AuditEvent['entityType'];
  entityId: string;
  action: string;
  actorUserId: string;
  actorRole: UserRole;
  details?: string;
}): Promise<AuditEvent> {
  const event: AuditEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    timestamp: new Date().toISOString(),
    details: params.details,
  };

  AUDIT_LOG.push(event);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('audit_events').insert({
        id: event.id,
        entity_type: event.entityType,
        entity_id: event.entityId,
        action: event.action,
        actor_user_id: event.actorUserId,
        actor_role: event.actorRole,
        timestamp: event.timestamp,
        details: event.details,
      });
    } catch (err) {
      console.warn('Supabase recordAuditEvent fallback:', err);
    }
  }

  return event;
}

export function getAuditLog(entityId?: string): AuditEvent[] {
  if (entityId) return AUDIT_LOG.filter(a => a.entityId === entityId);
  return [...AUDIT_LOG];
}

// ----------------------------------------------------------------
// SERVICE 7: Offline Sync Metadata Helper
// ----------------------------------------------------------------

export function buildSyncMetadata(
  overrides: Partial<SyncMetadata> = {}
): SyncMetadata {
  return {
    localId: undefined,
    serverId: undefined,
    syncStatus: 'PENDING' as SyncStatus,
    createdOffline: false,
    lastSyncedAt: undefined,
    syncAttempts: 0,
    ...overrides,
  };
}

export function markSynced(meta: SyncMetadata, serverId: string): SyncMetadata {
  return {
    ...meta,
    serverId,
    syncStatus: 'SYNCED',
    lastSyncedAt: new Date().toISOString(),
  };
}

export function markSyncFailed(meta: SyncMetadata): SyncMetadata {
  return {
    ...meta,
    syncStatus: 'FAILED',
    syncAttempts: (meta.syncAttempts ?? 0) + 1,
  };
}
