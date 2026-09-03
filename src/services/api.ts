// ============================================================
// LIVESTOCK SENTINEL — Unified Service & API Contracts Layer
// Member 1 — Backend & Supabase Database Integration Layer
// Pre-Merge Safety Review Compliant: Triage & Risk Scoring Only
// ============================================================

import { supabase, isSupabaseConfigured, ensureDemoUsersSeeded } from './supabase';
import type {
  HealthCase, SymptomReport, RiskAssessment, OutbreakCluster,
  VetAssignment, FieldVisit, Sample, LabResult, Alert,
  ResponseAction, CaseRecord, IncidentReport, VetAssessment,
  TimelineEvent, RiskBand, CaseStatus, AnimalSpecies, UserRole,
  VaccinationRecord, TreatmentRecord, AlertType
} from '../types';
import { generateCanonicalCaseId } from '../types';
import { SYNTHETIC_CASES, SYNTHETIC_NOTIFICATIONS } from '../data/seed';
import { RiskEngine } from './aiRiskEngine';
import { useNotificationStore } from '../store/notificationStore';
import { enqueueOfflineAction, getUnsyncedOfflineItems, markItemSynced } from './offlineQueue';
import { createAlert } from './platform';

// In-Memory store fallback for hackathon offline demo mode & immediate reactivity
let localCasesStore: CaseRecord[] = [...SYNTHETIC_CASES];

const MANDATORY_SAFETY_DISCLAIMER =
  'This is an AI-assisted risk assessment based on reported symptoms. It is NOT a definitive diagnosis. Veterinary confirmation is mandatory before any official action.';

// ----------------------------------------------------------------
// Helper to construct CaseRecord from raw components & Supabase rows
// ----------------------------------------------------------------
function buildCaseRecord(
  hc: Partial<HealthCase> & Record<string, any>,
  sr?: Partial<SymptomReport> & Record<string, any>,
  ra?: Partial<RiskAssessment> & Record<string, any>,
  va?: Partial<VetAssessment> & Record<string, any>,
  smp?: Partial<Sample> & Record<string, any>,
  lr?: Partial<LabResult> & Record<string, any>,
  ca?: ResponseAction[],
  vaccList: any[] = [],
  txList: any[] = [],
  events: any[] = []
): CaseRecord {
  const caseId = hc.id || generateCanonicalCaseId(Math.floor(Math.random() * 1000));
  const createdAt = hc.createdAt || hc.created_at || new Date().toISOString();

  const lat = typeof hc.latitude === 'number' ? hc.latitude : (parseFloat(String(hc.latitude || '20.0059')) || 20.0059);
  const lng = typeof hc.longitude === 'number' ? hc.longitude : (parseFloat(String(hc.longitude || '73.7930')) || 73.7930);

  const incidentReport: IncidentReport = {
    id: sr?.id || `sr-${caseId}`,
    reportedBy: hc.reportedByUserId || hc.reported_by_user_id || 'u-farmer-01',
    reporterRole: (hc.reporterRole || hc.reporter_role || 'farmer') as UserRole,
    createdAt,
    updatedAt: hc.updatedAt || hc.updated_at || createdAt,
    species: (hc.primarySpecies || hc.primary_species || 'cattle') as AnimalSpecies,
    totalAnimals: hc.totalAnimalsInHerd || hc.total_animals_in_herd || 10,
    affectedAnimals: hc.affectedAnimalCount || hc.affected_animal_count || 1,
    deadAnimals: hc.deadAnimalCount ?? hc.dead_animal_count ?? 0,
    symptomIds: sr?.symptomIds || sr?.symptom_ids || ['fever'],
    onsetDate: sr?.onsetDate || sr?.onset_date || createdAt.split('T')[0],
    durationDays: sr?.durationDays || sr?.duration_days || 1,
    additionalNotes: sr?.additionalNotes || sr?.additional_notes,
    location: {
      latitude: lat,
      longitude: lng,
      village: hc.village || 'Chandori',
      block: hc.block || 'Niphad',
      district: hc.district || 'Nashik',
      state: hc.state || 'Maharashtra',
    },
    isVaccinated: vaccList.length > 0,
    vaccineNames: vaccList[0]?.vaccine_name || vaccList[0]?.vaccineName,
    status: (hc.status || 'reported') as CaseStatus,
  };

  const triageResult = ra && (ra.riskScore !== undefined || ra.risk_score !== undefined) ? {
    id: ra.id || `ra-${caseId}`,
    caseId,
    incidentId: caseId,
    riskScore: ra.riskScore ?? ra.risk_score ?? 50,
    riskBand: (ra.riskBand || ra.risk_band || hc.risk_band || 'low') as RiskBand,
    syndromeCategory: ra.syndromeCategory || ra.syndrome_category || hc.syndrome_category || 'Clinical Examination Needed',
    suspectedDisease: ra.suspectedDisease || ra.suspected_disease || hc.suspected_disease,
    factors: ra.factors || [],
    recommendation: ra.recommendation || 'Veterinary assessment recommended.',
    requiresVeterinaryAssessment: true,
    disclaimer: ra.disclaimer || MANDATORY_SAFETY_DISCLAIMER,
    modelVersion: ra.modelVersion || ra.model_version || 'v1',
    isSynthetic: ra.isSynthetic ?? ra.is_synthetic ?? true,
    computedAt: ra.computedAt || ra.computed_at || createdAt,
  } : undefined;

  const vetAssessment: VetAssessment | undefined = va && (va.vetId || va.visited_by_user_id) ? {
    vetId: va.vetId || va.visited_by_user_id,
    assessedAt: va.assessedAt || va.visited_at || createdAt,
    clinicalFindings: va.clinicalFindings || va.clinical_observations || '',
    temperatureCelsius: va.temperatureCelsius || (va.temperature_celsius ? parseFloat(String(va.temperature_celsius)) : undefined),
    agreedWithAiRisk: va.agreedWithAiRisk ?? va.agreed_with_ai_risk ?? true,
    revisedRiskBand: (va.revisedRiskBand || va.revised_risk_band) as RiskBand | undefined,
    clinicalDiagnosis: va.clinicalDiagnosis || va.clinical_diagnosis,
    requiresSample: va.requiresSample ?? va.sample_required ?? false,
    treatmentRecommended: va.treatmentRecommended || va.treatment_recommended,
    quarantineRecommended: va.quarantineRecommended ?? va.quarantine_recommended ?? false,
    notes: va.notes,
    photos: va.photos || [],
  } : undefined;

  const sampleCollection = smp && (smp.id || smp.sample_type || smp.barcode) ? {
    id: smp.id || `smp-${caseId}`,
    caseId,
    barcode: smp.barcode || `SNT-${caseId}`,
    sampleType: smp.sampleType || smp.sample_type || 'Blood Serum',
    collectedByUserId: smp.collectedByUserId || smp.collected_by_user_id || 'u-paravet-01',
    collectedBy: smp.collectedByUserId || smp.collected_by_user_id || 'u-paravet-01',
    collectedAt: smp.collectedAt || smp.collected_at || createdAt,
    animalCountSampled: smp.animalCountSampled || smp.animal_count_sampled || 1,
    animalCount: smp.animalCountSampled || smp.animal_count_sampled || 1,
    destinationLabName: smp.destinationLabName || smp.destination_lab_name || 'NRFMD Lab',
    destinationLab: smp.destinationLabName || smp.destination_lab_name || 'NRFMD Lab',
    dispatchedAt: smp.dispatchedAt || smp.dispatched_at,
    receivedAt: smp.receivedAt || smp.received_at,
    sampleId: smp.id || `smp-${caseId}`,
    chainOfCustody: smp.chainOfCustody || smp.chain_of_custody || [],
  } : undefined;

  const labResult: LabResult | undefined = lr && (lr.testName || lr.test_name) ? {
    id: lr.id || `lr-${caseId}`,
    sampleId: lr.sampleId || lr.sample_id || `smp-${caseId}`,
    caseId,
    labUserId: lr.labUserId || lr.lab_user_id || 'u-lab-01',
    techId: lr.labUserId || lr.lab_user_id || 'u-lab-01',
    labId: 'lab-nrfmd-01',
    testName: lr.testName || lr.test_name,
    status: (lr.status || 'pending') as any,
    pathogenConfirmed: lr.pathogenConfirmed || lr.pathogen_confirmed,
    pathogen: lr.pathogenConfirmed || lr.pathogen_confirmed,
    serotype: lr.serotype,
    confirmedDisease: lr.confirmedDisease || lr.confirmed_disease || hc.confirmed_disease,
    ctValue: lr.ctValue || (lr.ct_value ? parseFloat(String(lr.ct_value)) : undefined),
    notes: lr.notes,
    completedAt: lr.completedAt || lr.completed_at || createdAt,
  } : undefined;

  const vaccinationRecords: VaccinationRecord[] = vaccList.map(v => ({
    id: v.id,
    caseId: v.case_id || v.caseId,
    species: v.species,
    vaccineName: v.vaccine_name || v.vaccineName,
    batchNumber: v.batch_number || v.batchNumber,
    administeredByUserId: v.administered_by_user_id || v.administeredByUserId,
    administeredAt: v.administered_at || v.administeredAt,
    nextDueDate: v.next_due_date || v.nextDueDate,
  }));

  const treatmentRecords: TreatmentRecord[] = txList.map(t => ({
    id: t.id,
    caseId: t.case_id || t.caseId,
    prescribedByVetId: t.prescribed_by_vet_id || t.prescribedByVetId,
    medicationName: t.medication_name || t.medicationName,
    dosage: t.dosage,
    instructions: t.instructions,
    administeredAt: t.administered_at || t.administeredAt,
  }));

  const timeline: TimelineEvent[] = events && events.length > 0
    ? events.map(ev => ({
        id: ev.id,
        caseId: ev.case_id || ev.caseId || caseId,
        timestamp: ev.timestamp || createdAt,
        eventType: (ev.event_type || ev.eventType || 'incident_reported').toLowerCase(),
        actorId: ev.actor_user_id || ev.actorId || 'system',
        actorRole: (ev.actor_role || ev.actorRole || 'system') as UserRole,
        summary: ev.summary || 'Event logged',
        details: ev.metadata ? JSON.stringify(ev.metadata) : undefined,
      }))
    : [
        {
          id: `tl-${caseId}-1`,
          caseId,
          timestamp: createdAt,
          eventType: 'incident_reported',
          actorId: hc.reportedByUserId || hc.reported_by_user_id || 'u-farmer-01',
          actorRole: (hc.reporterRole || hc.reporter_role || 'farmer') as UserRole,
          summary: `Incident reported. Canonical Case ID: ${caseId}`,
        },
      ];

  return {
    id: caseId,
    incidentReport,
    triageResult,
    assignedVetId: hc.assignedVetUserId || hc.assigned_vet_user_id,
    vetAssessment,
    sampleCollection,
    labResult,
    vaccinationRecords: vaccinationRecords.length > 0 ? vaccinationRecords : undefined,
    treatmentRecords: treatmentRecords.length > 0 ? treatmentRecords : undefined,
    containmentActions: ca || [],
    timeline,
  };
}

// ----------------------------------------------------------------
// API CONTRACT 1: Create Case (Canonical ID: LV-2026-XXXXX)
// ----------------------------------------------------------------
export async function createCase(payload: {
  reportedByUserId: string;
  reporterRole: UserRole;
  primarySpecies: AnimalSpecies;
  totalAnimalsInHerd: number;
  affectedAnimalCount: number;
  deadAnimalCount: number;
  symptomIds: string[];
  onsetDate: string;
  durationDays: number;
  additionalNotes?: string;
  latitude: number;
  longitude: number;
  village: string;
  block: string;
  district: string;
  state: string;
  isVaccinated: boolean;
  vaccineNames?: string;
}): Promise<{ caseId: string; record: CaseRecord; isSyncedToDatabase: boolean }> {
  const sequenceNum = localCasesStore.length + 1;
  const canonicalId = generateCanonicalCaseId(sequenceNum);

  // 1. Run deterministic AI risk assessment immediately
  const triageAssessment = RiskEngine.assess({
    caseId: canonicalId,
    species: payload.primarySpecies,
    totalAnimals: payload.totalAnimalsInHerd,
    affectedAnimals: payload.affectedAnimalCount,
    deadAnimals: payload.deadAnimalCount,
    symptomIds: payload.symptomIds,
    isVaccinated: payload.isVaccinated,
    vaccineNames: payload.vaccineNames,
    onsetDate: payload.onsetDate,
    durationDays: payload.durationDays,
    additionalNotes: payload.additionalNotes,
    location: {
      latitude: payload.latitude,
      longitude: payload.longitude,
      village: payload.village,
      block: payload.block,
      district: payload.district,
      state: payload.state,
    },
  });

  let isSyncedToDatabase = false;

  // 2. Persist to Supabase when configured
  if (isSupabaseConfigured()) {
    try {
      await ensureDemoUsersSeeded();

      // Insert health_cases
      const { error: hcError } = await supabase
        .from('health_cases')
        .insert({
          id: canonicalId,
          reported_by_user_id: payload.reportedByUserId,
          reporter_role: payload.reporterRole,
          status: 'reported',
          risk_band: triageAssessment.riskBand,
          primary_species: payload.primarySpecies,
          total_animals_in_herd: payload.totalAnimalsInHerd,
          affected_animal_count: payload.affectedAnimalCount,
          dead_animal_count: payload.deadAnimalCount,
          village: payload.village,
          block: payload.block,
          district: payload.district,
          state: payload.state,
          latitude: payload.latitude,
          longitude: payload.longitude,
          syndrome_category: triageAssessment.syndromeCategory,
          suspected_disease: triageAssessment.suspectedDisease,
        });

      if (hcError) {
        console.error('[Supabase] health_cases insert failed:', hcError.message || hcError);
      } else {
        isSyncedToDatabase = true;

        // Insert symptom_reports
        const { error: srError } = await supabase.from('symptom_reports').insert({
          case_id: canonicalId,
          symptom_ids: payload.symptomIds,
          onset_date: payload.onsetDate,
          duration_days: payload.durationDays,
          additional_notes: payload.additionalNotes || null,
        });
        if (srError) {
          console.error('[Supabase] symptom_reports insert failed:', srError.message || srError);
        }

        // Insert risk_assessments
        const { error: raError } = await supabase.from('risk_assessments').insert({
          id: triageAssessment.id,
          case_id: canonicalId,
          risk_score: triageAssessment.riskScore,
          risk_band: triageAssessment.riskBand,
          syndrome_category: triageAssessment.syndromeCategory,
          suspected_disease: triageAssessment.suspectedDisease,
          factors: triageAssessment.factors,
          recommendation: triageAssessment.recommendation,
          requires_veterinary_assessment: true,
          disclaimer: triageAssessment.disclaimer,
          model_version: triageAssessment.modelVersion,
          is_synthetic: triageAssessment.isSynthetic,
        });
        if (raError) {
          console.error('[Supabase] risk_assessments insert failed:', raError.message || raError);
        }

        // Insert initial case_event
        const { error: ceError } = await supabase.from('case_events').insert({
          case_id: canonicalId,
          actor_user_id: payload.reportedByUserId,
          actor_role: payload.reporterRole,
          event_type: 'CASE_CREATED',
          summary: `Incident reported for ${payload.primarySpecies} in ${payload.village}. Canonical Case ID: ${canonicalId}`,
          metadata: {
            species: payload.primarySpecies,
            riskBand: triageAssessment.riskBand,
            riskScore: triageAssessment.riskScore,
            suspectedDisease: triageAssessment.suspectedDisease,
          },
        });
        if (ceError) {
          console.error('[Supabase] case_events insert failed:', ceError.message || ceError);
        }

        // If high or critical risk, broadcast alert
        if (triageAssessment.riskBand === 'high' || triageAssessment.riskBand === 'critical') {
          const alertType: AlertType = 'HIGH_RISK_CASE';
          await createAlert({
            alertType,
            caseId: canonicalId,
            severity: triageAssessment.riskBand === 'critical' ? 'critical' : 'warning',
            title: `High-Risk Incident Reported in ${payload.village} (${payload.district})`,
            message: `${payload.primarySpecies} showing ${triageAssessment.syndromeCategory || 'symptoms'}. Priority veterinary assessment required.`,
            targetRoles: ['veterinarian', 'gov_officer', 'paravet'],
            targetDistrict: payload.district,
            actionPath: `/cases/${canonicalId}`,
            actionLabel: 'Inspect Case',
          });
        }
      }
    } catch (err: any) {
      console.error('[Supabase] createCase exception, falling back to local store:', err?.message || err);
    }
  }

  // 3. Build local record & update localCasesStore
  const newRecord = buildCaseRecord(
    {
      id: canonicalId,
      reportedByUserId: payload.reportedByUserId,
      reporterRole: payload.reporterRole,
      primarySpecies: payload.primarySpecies,
      totalAnimalsInHerd: payload.totalAnimalsInHerd,
      affectedAnimalCount: payload.affectedAnimalCount,
      deadAnimalCount: payload.deadAnimalCount,
      village: payload.village,
      block: payload.block,
      district: payload.district,
      state: payload.state,
      latitude: payload.latitude,
      longitude: payload.longitude,
      status: 'reported',
      riskBand: triageAssessment.riskBand,
      syndromeCategory: triageAssessment.syndromeCategory,
      suspectedDisease: triageAssessment.suspectedDisease,
    },
    {
      symptomIds: payload.symptomIds,
      onsetDate: payload.onsetDate,
      durationDays: payload.durationDays,
      additionalNotes: payload.additionalNotes,
    },
    triageAssessment
  );

  localCasesStore = [newRecord, ...localCasesStore];
  return { caseId: canonicalId, record: newRecord, isSyncedToDatabase };
}

// ----------------------------------------------------------------
// API CONTRACT 2: Get Cases (Hydrated from Supabase)
// ----------------------------------------------------------------
export async function getCases(filters?: {
  district?: string;
  riskBand?: RiskBand;
  status?: CaseStatus;
}): Promise<CaseRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      await ensureDemoUsersSeeded();

      let query = supabase.from('health_cases').select('*').order('created_at', { ascending: false });
      if (filters?.district) query = query.eq('district', filters.district);
      if (filters?.riskBand) query = query.eq('risk_band', filters.riskBand);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data: hcList, error: hcError } = await query;
      if (hcError) throw hcError;

      if (hcList && hcList.length > 0) {
        const caseIds = hcList.map(h => h.id);

        // Batch fetch related tables in parallel
        const [
          { data: srList },
          { data: raList },
          { data: fvList },
          { data: smpList },
          { data: lrList },
          { data: vaccList },
          { data: txList },
          { data: evList },
        ] = await Promise.all([
          supabase.from('symptom_reports').select('*').in('case_id', caseIds),
          supabase.from('risk_assessments').select('*').in('case_id', caseIds),
          supabase.from('field_visits').select('*').in('case_id', caseIds),
          supabase.from('samples').select('*').in('case_id', caseIds),
          supabase.from('lab_results').select('*').in('case_id', caseIds),
          supabase.from('vaccination_records').select('*').in('case_id', caseIds),
          supabase.from('treatment_records').select('*').in('case_id', caseIds),
          supabase.from('case_events').select('*').in('case_id', caseIds).order('timestamp', { ascending: true }),
        ]);

        // Group related data by case_id
        const srMap = new Map((srList || []).map(r => [r.case_id, r]));
        const raMap = new Map((raList || []).map(r => [r.case_id, r]));
        const fvMap = new Map((fvList || []).map(r => [r.case_id, r]));
        const smpMap = new Map((smpList || []).map(r => [r.case_id, r]));
        const lrMap = new Map((lrList || []).map(r => [r.case_id, r]));

        const vaccMap = new Map<string, any[]>();
        (vaccList || []).forEach(v => {
          const list = vaccMap.get(v.case_id) || [];
          list.push(v);
          vaccMap.set(v.case_id, list);
        });

        const txMap = new Map<string, any[]>();
        (txList || []).forEach(t => {
          const list = txMap.get(t.case_id) || [];
          list.push(t);
          txMap.set(t.case_id, list);
        });

        const evMap = new Map<string, any[]>();
        (evList || []).forEach(e => {
          const list = evMap.get(e.case_id) || [];
          list.push(e);
          evMap.set(e.case_id, list);
        });

        const dbRecords = hcList.map(hc =>
          buildCaseRecord(
            hc,
            srMap.get(hc.id),
            raMap.get(hc.id),
            fvMap.get(hc.id),
            smpMap.get(hc.id),
            lrMap.get(hc.id),
            undefined,
            vaccMap.get(hc.id) || [],
            txMap.get(hc.id) || [],
            evMap.get(hc.id) || []
          )
        );

        // Merge Supabase cases with any distinct local-only cases
        const dbIds = new Set(dbRecords.map(c => c.id));
        const remainingLocal = localCasesStore.filter(c => !dbIds.has(c.id));
        const merged = [...dbRecords, ...remainingLocal];
        localCasesStore = merged;

        return merged;
      }
    } catch (err) {
      console.warn('Supabase getCases fallback to local store:', err);
    }
  }

  let result = [...localCasesStore];
  if (filters?.district) result = result.filter(c => c.incidentReport.location.district === filters.district);
  if (filters?.riskBand) result = result.filter(c => c.triageResult?.riskBand === filters.riskBand);
  if (filters?.status) result = result.filter(c => c.incidentReport.status === filters.status);
  return result;
}

// ----------------------------------------------------------------
// API CONTRACT 3: Get Case By ID (Direct Supabase Query with Fallback)
// ----------------------------------------------------------------
export async function getCaseById(caseId: string): Promise<CaseRecord | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data: hc, error: hcError } = await supabase
        .from('health_cases')
        .select('*')
        .eq('id', caseId)
        .single();

      if (!hcError && hc) {
        const [
          { data: srList },
          { data: raList },
          { data: fvList },
          { data: smpList },
          { data: lrList },
          { data: vaccList },
          { data: txList },
          { data: evList },
        ] = await Promise.all([
          supabase.from('symptom_reports').select('*').eq('case_id', caseId),
          supabase.from('risk_assessments').select('*').eq('case_id', caseId),
          supabase.from('field_visits').select('*').eq('case_id', caseId),
          supabase.from('samples').select('*').eq('case_id', caseId),
          supabase.from('lab_results').select('*').eq('case_id', caseId),
          supabase.from('vaccination_records').select('*').eq('case_id', caseId),
          supabase.from('treatment_records').select('*').eq('case_id', caseId),
          supabase.from('case_events').select('*').eq('case_id', caseId).order('timestamp', { ascending: true }),
        ]);

        const record = buildCaseRecord(
          hc,
          srList?.[0],
          raList?.[0],
          fvList?.[0],
          smpList?.[0],
          lrList?.[0],
          undefined,
          vaccList || [],
          txList || [],
          evList || []
        );

        // Keep localCasesStore synchronized
        const existingIdx = localCasesStore.findIndex(c => c.id === caseId);
        if (existingIdx >= 0) {
          localCasesStore[existingIdx] = record;
        } else {
          localCasesStore = [record, ...localCasesStore];
        }

        return record;
      }
    } catch (err) {
      console.warn('Supabase getCaseById fallback to local store:', err);
    }
  }

  const found = localCasesStore.find(c => c.id === caseId);
  return found || null;
}

// ----------------------------------------------------------------
// API CONTRACT 4: Submit Risk Assessment (Triage Only - Safety Compliant)
// ----------------------------------------------------------------
export async function submitRiskAssessment(assessment: Omit<RiskAssessment, 'id'>): Promise<RiskAssessment> {
  const newAssessment: RiskAssessment = {
    ...assessment,
    id: `ra-${assessment.caseId}`,
    requiresVeterinaryAssessment: true, // HARDCODED SAFETY ENFORCEMENT
    disclaimer: assessment.disclaimer || MANDATORY_SAFETY_DISCLAIMER,
  };

  const target = localCasesStore.find(c => c.id === assessment.caseId);
  if (target) {
    target.triageResult = {
      ...newAssessment,
      incidentId: assessment.caseId,
    };
    target.incidentReport.status = 'triaged';
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('risk_assessments').insert({
        id: newAssessment.id,
        case_id: assessment.caseId,
        risk_score: assessment.riskScore,
        risk_band: assessment.riskBand,
        syndrome_category: assessment.syndromeCategory,
        suspected_disease: assessment.suspectedDisease,
        factors: assessment.factors,
        recommendation: assessment.recommendation,
        disclaimer: newAssessment.disclaimer,
        model_version: assessment.modelVersion,
        is_synthetic: assessment.isSynthetic,
      });

      await supabase
        .from('health_cases')
        .update({ risk_band: assessment.riskBand, status: 'triaged', updated_at: new Date().toISOString() })
        .eq('id', assessment.caseId);
    } catch (err) {
      console.warn('Supabase submitRiskAssessment fallback:', err);
    }
  }

  return newAssessment;
}

// ----------------------------------------------------------------
// API CONTRACT 5: Retrieve Clusters (Dynamic AI Cluster Detector)
// ----------------------------------------------------------------
export async function retrieveClusters(district?: string): Promise<OutbreakCluster[]> {
  const dynamicClusters = RiskEngine.detectClusters(localCasesStore, 10.0);

  const fallbackClusters: OutbreakCluster[] = [
    {
      id: 'cluster-01',
      clusterName: 'Chandori FMD Hotspot Cluster',
      centerLatitude: 20.0059,
      centerLongitude: 73.7930,
      radiusMeters: 3000,
      caseIds: ['LV-2026-00001', 'LV-2026-00003'],
      primaryDisease: 'FMD',
      affectedDistrict: 'Nashik',
      affectedBlocks: ['Niphad'],
      riskLevel: 'high',
      activeCaseCount: 8,
      detectedAt: '2026-08-22T10:00:00Z',
      status: 'active',
    },
  ];

  const combined = dynamicClusters.length > 0 ? dynamicClusters : fallbackClusters;

  if (district) return combined.filter(c => c.affectedDistrict === district);
  return combined;
}

// ----------------------------------------------------------------
// API CONTRACT 6: Assign Veterinarian
// ----------------------------------------------------------------
export async function assignVeterinarian(caseId: string, vetUserId: string, assignedByUserId: string): Promise<VetAssignment> {
  const assignment: VetAssignment = {
    id: `va-${caseId}-${Date.now()}`,
    caseId,
    assignedVetUserId: vetUserId,
    assignedByUserId,
    assignedAt: new Date().toISOString(),
    status: 'pending',
  };

  const target = localCasesStore.find(c => c.id === caseId);
  if (target) {
    target.assignedVetId = vetUserId;
    target.incidentReport.status = 'vet_assigned';
  }

  if (isSupabaseConfigured()) {
    try {
      await ensureDemoUsersSeeded();

      await supabase.from('vet_assignments').insert({
        id: assignment.id,
        case_id: caseId,
        assigned_vet_user_id: vetUserId,
        assigned_by_user_id: assignedByUserId,
        assigned_at: assignment.assignedAt,
        status: 'pending',
      });

      await supabase
        .from('health_cases')
        .update({
          assigned_vet_user_id: vetUserId,
          status: 'vet_assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseId);

      await supabase.from('case_events').insert({
        case_id: caseId,
        actor_user_id: assignedByUserId,
        actor_role: 'gov_officer',
        event_type: 'VET_ASSIGNED',
        summary: `Veterinarian (${vetUserId}) assigned to Case ${caseId}`,
      });
    } catch (err) {
      console.warn('Supabase assignVeterinarian fallback:', err);
    }
  }

  return assignment;
}

// ----------------------------------------------------------------
// API CONTRACT 7: Record Field Visit & Vet Assessment
// ----------------------------------------------------------------
export async function recordFieldVisit(visit: Omit<FieldVisit, 'id'>): Promise<FieldVisit> {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  const newVisit: FieldVisit = {
    ...visit,
    id: `fv-${visit.caseId}-${Date.now()}`,
  };

  if (isOffline) {
    await enqueueOfflineAction('field_visit', visit.caseId, newVisit);
  }

  if (isSupabaseConfigured() && !isOffline) {
    try {
      await ensureDemoUsersSeeded();

      await supabase.from('field_visits').insert({
        id: newVisit.id,
        case_id: visit.caseId,
        visited_by_user_id: visit.visitedByUserId,
        visitor_role: visit.visitorRole,
        visited_at: visit.visitedAt || new Date().toISOString(),
        clinical_observations: visit.clinicalObservations,
        temperature_celsius: visit.temperatureCelsius || null,
        agreed_with_ai_risk: visit.agreedWithAiRisk ?? true,
        revised_risk_band: visit.revisedRiskBand || null,
        clinical_diagnosis: visit.clinicalDiagnosis || null,
        quarantine_recommended: visit.quarantineRecommended ?? false,
        sample_required: visit.sampleRequired ?? false,
        notes: visit.notes || null,
      });

      await supabase
        .from('health_cases')
        .update({
          status: 'vet_assessed',
          risk_band: visit.revisedRiskBand || undefined,
          affected_animal_count: visit.affectedCount || undefined,
          dead_animal_count: visit.mortality || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', visit.caseId);

      await supabase.from('case_events').insert({
        case_id: visit.caseId,
        actor_user_id: visit.visitedByUserId,
        actor_role: visit.visitorRole,
        event_type: 'FIELD_VISIT_COMPLETED',
        summary: `Clinical field examination logged: ${visit.clinicalObservations.slice(0, 80)}`,
        metadata: {
          diagnosis: visit.clinicalDiagnosis,
          quarantine: visit.quarantineRecommended,
          sampleRequired: visit.sampleRequired,
        },
      });
    } catch (err) {
      console.warn('Supabase recordFieldVisit fallback:', err);
    }
  }

  const target = localCasesStore.find(c => c.id === visit.caseId);
  if (target) {
    target.vetAssessment = {
      ...newVisit,
      vetId: visit.visitedByUserId,
      assessedAt: visit.visitedAt,
      clinicalFindings: visit.clinicalObservations,
      agreedWithAiRisk: visit.agreedWithAiRisk,
      revisedRiskBand: visit.revisedRiskBand,
      requiresSample: visit.sampleRequired,
      quarantineRecommended: visit.quarantineRecommended,
      notes: visit.notes,
      photos: visit.photos || [],
    };
    target.incidentReport.status = 'vet_assessed';

    if (visit.affectedCount !== undefined) {
      target.incidentReport.affectedAnimals = visit.affectedCount;
    }
    if (visit.mortality !== undefined) {
      target.incidentReport.deadAnimals = visit.mortality;
    }

    target.timeline.push({
      id: `tl-${visit.caseId}-${Date.now()}`,
      caseId: visit.caseId,
      timestamp: visit.visitedAt || new Date().toISOString(),
      eventType: 'field_visit',
      actorId: visit.visitedByUserId,
      actorRole: visit.visitorRole || 'veterinarian',
      summary: `Clinical Field Visit recorded. Findings: ${visit.clinicalObservations.substring(0, 80)}...`,
      details: visit.suspectedSyndrome ? `Suspected Syndrome: ${visit.suspectedSyndrome}` : undefined,
    });
  }

  return newVisit;
}

// ----------------------------------------------------------------
// API CONTRACT 8: Create Sample Collection
// ----------------------------------------------------------------
export async function createSample(sample: Omit<Sample, 'id' | 'barcode' | 'chainOfCustody'>): Promise<Sample> {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const barcode = `SNT-${sample.caseId.replace(/[^0-9]/g, '') || Date.now().toString().slice(-5)}`;
  const newSample: Sample = {
    ...sample,
    id: `smp-${sample.caseId}`,
    barcode,
    transportStatus: sample.transportStatus || 'collected',
    chainOfCustody: [
      {
        step: 'Collected',
        timestamp: sample.collectedAt,
        handledBy: sample.collectedByUserId,
        notes: `Sample collected (${sample.sampleType}) from animal ${sample.animalId || 'Herd'}`,
      },
    ],
  };

  if (isOffline) {
    await enqueueOfflineAction('sample_collection', sample.caseId, newSample);
  }

  if (isSupabaseConfigured() && !isOffline) {
    try {
      await ensureDemoUsersSeeded();

      const { error: smpError } = await supabase.from('samples').insert({
        id: newSample.id,
        case_id: sample.caseId,
        barcode: newSample.barcode,
        sample_type: sample.sampleType,
        collected_by_user_id: sample.collectedByUserId,
        collected_at: sample.collectedAt,
        animal_count_sampled: sample.animalCountSampled || 1,
        destination_lab_name: sample.destinationLabName,
        chain_of_custody: newSample.chainOfCustody,
      });

      if (smpError) {
        console.error('[Supabase] samples insert failed:', smpError.message || smpError);
        throw smpError;
      }

      await supabase
        .from('health_cases')
        .update({
          status: 'sample_collected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sample.caseId);

      await supabase.from('case_events').insert({
        case_id: sample.caseId,
        actor_user_id: sample.collectedByUserId,
        actor_role: 'field_worker',
        event_type: 'SAMPLE_COLLECTED',
        summary: `Sample collected (${sample.sampleType}). Barcode: ${newSample.barcode}`,
        metadata: { destinationLab: sample.destinationLabName },
      });
    } catch (err: any) {
      console.error('[Supabase] createSample operation failed:', err?.message || err);
      throw err;
    }
  }

  const target = localCasesStore.find(c => c.id === sample.caseId);
  if (target) {
    target.sampleCollection = {
      ...newSample,
      sampleId: newSample.id,
      collectedBy: sample.collectedByUserId,
      destinationLabName: sample.destinationLabName,
      destinationLab: sample.destinationLabName,
      animalCountSampled: sample.animalCountSampled,
      animalCount: sample.animalCountSampled,
    };
    target.incidentReport.status = 'sample_collected';

    target.timeline.push({
      id: `tl-${sample.caseId}-${Date.now()}`,
      caseId: sample.caseId,
      timestamp: sample.collectedAt || new Date().toISOString(),
      eventType: 'sample_collected',
      actorId: sample.collectedByUserId,
      actorRole: 'field_worker',
      summary: `Sample (${sample.sampleType}) collected for ${sample.animalId || 'Animal'}. Barcode: ${barcode}`,
    });
  }

  return newSample;
}

// ----------------------------------------------------------------
// API CONTRACT 8B: Record Animal Vaccination
// ----------------------------------------------------------------
export async function recordAnimalVaccination(record: Omit<VaccinationRecord, 'id'>): Promise<VaccinationRecord> {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const newRecord: VaccinationRecord = {
    ...record,
    id: `vac-${Date.now()}`,
  };

  if (record.caseId && isOffline) {
    await enqueueOfflineAction('vaccination_update', record.caseId, newRecord);
  }

  if (isSupabaseConfigured() && !isOffline) {
    try {
      await ensureDemoUsersSeeded();
      await supabase.from('vaccination_records').insert({
        id: newRecord.id,
        case_id: record.caseId || null,
        species: record.species,
        vaccine_name: record.vaccineName,
        batch_number: record.batchNumber || null,
        administered_by_user_id: record.administeredByUserId,
        administered_at: record.administeredAt || new Date().toISOString(),
        next_due_date: record.nextDueDate || null,
      });

      if (record.caseId) {
        await supabase.from('case_events').insert({
          case_id: record.caseId,
          actor_user_id: record.administeredByUserId,
          actor_role: 'veterinarian',
          event_type: 'VACCINATION_DRIVE' as any,
          summary: `Vaccination record logged: ${record.vaccineName} (Batch: ${record.batchNumber || 'N/A'})`,
        });
      }
    } catch (err) {
      console.warn('Supabase recordAnimalVaccination fallback:', err);
    }
  }

  if (record.caseId) {
    const target = localCasesStore.find(c => c.id === record.caseId);
    if (target) {
      target.vaccinationRecords = target.vaccinationRecords || [];
      target.vaccinationRecords.push(newRecord);
      target.incidentReport.isVaccinated = true;
      target.incidentReport.vaccineNames = record.vaccineName;

      target.timeline.push({
        id: `tl-${record.caseId}-${Date.now()}`,
        caseId: record.caseId,
        timestamp: record.administeredAt || new Date().toISOString(),
        eventType: 'vaccination_updated',
        actorId: record.administeredByUserId,
        actorRole: 'veterinarian',
        summary: `Vaccination logged: ${record.vaccineName} (Batch: ${record.batchNumber || 'N/A'})`,
      });
    }
  }

  return newRecord;
}

// ----------------------------------------------------------------
// API CONTRACT 8C: Record Treatment Prescription
// ----------------------------------------------------------------
export async function recordTreatment(treatment: Omit<TreatmentRecord, 'id'>): Promise<TreatmentRecord> {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const newRecord: TreatmentRecord = {
    ...treatment,
    id: `tx-${Date.now()}`,
  };

  if (isOffline) {
    await enqueueOfflineAction('treatment_record', treatment.caseId, newRecord);
  }

  if (isSupabaseConfigured() && !isOffline) {
    try {
      await ensureDemoUsersSeeded();
      await supabase.from('treatment_records').insert({
        id: newRecord.id,
        case_id: treatment.caseId,
        prescribed_by_vet_id: treatment.prescribedByVetId,
        medication_name: treatment.medicationName,
        dosage: treatment.dosage || null,
        instructions: treatment.instructions || null,
        administered_at: treatment.administeredAt || new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Supabase recordTreatment fallback:', err);
    }
  }

  const target = localCasesStore.find(c => c.id === treatment.caseId);
  if (target) {
    target.treatmentRecords = target.treatmentRecords || [];
    target.treatmentRecords.push(newRecord);

    if (target.vetAssessment) {
      target.vetAssessment.treatmentRecommended = treatment.medicationName;
    }

    target.timeline.push({
      id: `tl-${treatment.caseId}-${Date.now()}`,
      caseId: treatment.caseId,
      timestamp: treatment.administeredAt || new Date().toISOString(),
      eventType: 'treatment_added',
      actorId: treatment.prescribedByVetId,
      actorRole: 'veterinarian',
      summary: `Treatment prescribed: ${treatment.medicationName} (${treatment.dosage || 'Standard dosage'})`,
    });
  }

  return newRecord;
}

// ----------------------------------------------------------------
// API CONTRACT 8D: Operational Priority Escalation
// ----------------------------------------------------------------
export async function escalateCasePriority(
  caseId: string,
  newBand: RiskBand,
  escalatedByUserId: string,
  userRole: UserRole,
  reason: string
): Promise<CaseRecord | null> {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (isOffline) {
    await enqueueOfflineAction('priority_escalation', caseId, { newBand, escalatedByUserId, reason });
  }

  if (isSupabaseConfigured() && !isOffline) {
    try {
      await supabase
        .from('health_cases')
        .update({
          risk_band: newBand,
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseId);

      await supabase.from('case_events').insert({
        case_id: caseId,
        actor_user_id: escalatedByUserId,
        actor_role: userRole,
        event_type: 'RISK_ASSESSED',
        summary: `Operational priority escalated to ${newBand.toUpperCase()}: ${reason}`,
      });
    } catch (err) {
      console.warn('Supabase escalateCasePriority fallback:', err);
    }
  }

  const target = localCasesStore.find(c => c.id === caseId);
  if (target) {
    if (target.triageResult) {
      target.triageResult.riskBand = newBand;
    }

    const actionText =
      newBand === 'low' ? 'Routine Monitoring' :
      newBand === 'moderate' ? 'Veterinary Review Requested' :
      newBand === 'high' ? 'Priority Field Visit Dispatched' :
      'CRITICAL District Level Escalation Initiated';

    target.timeline.push({
      id: `tl-${caseId}-${Date.now()}`,
      caseId,
      timestamp: new Date().toISOString(),
      eventType: 'escalated',
      actorId: escalatedByUserId,
      actorRole: userRole,
      summary: `Operational Priority updated to ${newBand.toUpperCase()} — ${actionText}`,
      details: reason,
    });

    return target;
  }
  return null;
}

// ----------------------------------------------------------------
// API CONTRACT 8E: Close Case
// ----------------------------------------------------------------
export async function closeCase(
  caseId: string,
  closedByUserId: string,
  userRole: UserRole,
  resolutionNotes: string
): Promise<CaseRecord | null> {
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('health_cases')
        .update({
          status: 'closed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseId);

      await supabase.from('case_events').insert({
        case_id: caseId,
        actor_user_id: closedByUserId,
        actor_role: userRole,
        event_type: 'CASE_CLOSED',
        summary: `Case CLOSED & Contained. Resolution: ${resolutionNotes}`,
      });
    } catch (err) {
      console.warn('Supabase closeCase fallback:', err);
    }
  }

  const target = localCasesStore.find(c => c.id === caseId);
  if (target) {
    target.incidentReport.status = 'closed';
    target.timeline.push({
      id: `tl-${caseId}-${Date.now()}`,
      caseId,
      timestamp: new Date().toISOString(),
      eventType: 'case_closed',
      actorId: closedByUserId,
      actorRole: userRole,
      summary: `Case CLOSED & Contained. Resolution: ${resolutionNotes}`,
    });
    return target;
  }
  return null;
}

// ----------------------------------------------------------------
// API CONTRACT 8F: Sync Offline Queue to Local Store & Supabase
// ----------------------------------------------------------------
export async function syncOfflineQueueToApi(): Promise<{ syncedCount: number }> {
  const unsynced = await getUnsyncedOfflineItems();
  let count = 0;
  for (const item of unsynced) {
    try {
      if (item.type === 'field_visit') {
        await recordFieldVisit(item.payload);
      } else if (item.type === 'sample_collection') {
        await createSample(item.payload);
      } else if (item.type === 'vaccination_update') {
        await recordAnimalVaccination(item.payload);
      } else if (item.type === 'treatment_record') {
        await recordTreatment(item.payload);
      } else if (item.type === 'priority_escalation') {
        await escalateCasePriority(
          item.caseId,
          item.payload.newBand,
          item.payload.escalatedByUserId,
          'veterinarian',
          item.payload.reason || 'Offline sync priority update'
        );
      }
      await markItemSynced(item.id);
      count++;
    } catch (e) {
      console.warn('Failed to sync offline item:', item, e);
    }
  }
  return { syncedCount: count };
}

// ----------------------------------------------------------------
// API CONTRACT 9: Update Sample (Chain of Custody)
// ----------------------------------------------------------------
export async function updateSample(sampleId: string, step: string, handledBy: string, notes?: string): Promise<Sample | null> {
  let foundSample: Sample | null = null;
  let matchedCaseId: string | null = null;

  for (const c of localCasesStore) {
    if (c.sampleCollection && (c.sampleCollection.id === sampleId || c.sampleCollection.sampleId === sampleId)) {
      c.sampleCollection.chainOfCustody.push({
        step,
        timestamp: new Date().toISOString(),
        handledBy,
        notes,
      });
      foundSample = c.sampleCollection as any;
      matchedCaseId = c.id;
      break;
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const now = new Date().toISOString();
      const nextStatus =
        step === 'Dispatched' ? 'sample_dispatched' :
        step === 'Received' ? 'sample_received' :
        step === 'Testing' ? 'lab_processing' : 'sample_collected';

      const { data: currentSample } = await supabase.from('samples').select('*').eq('id', sampleId).single();
      if (currentSample) {
        const updatedChain = [
          ...(currentSample.chain_of_custody || []),
          { step, timestamp: now, handledBy, notes },
        ];
        await supabase
          .from('samples')
          .update({
            chain_of_custody: updatedChain,
            dispatchedAt: step === 'Dispatched' ? now : currentSample.dispatchedAt,
            receivedAt: step === 'Received' ? now : currentSample.receivedAt,
          })
          .eq('id', sampleId);

        const cid = matchedCaseId || currentSample.case_id;
        if (cid) {
          await supabase.from('health_cases').update({ status: nextStatus, updated_at: now }).eq('id', cid);
          await supabase.from('case_events').insert({
            case_id: cid,
            actor_user_id: handledBy,
            actor_role: 'lab_tech',
            event_type: step === 'Dispatched' ? 'SAMPLE_DISPATCHED' : 'LAB_RECEIVED',
            summary: `Chain of custody advanced to ${step} by ${handledBy}`,
          });
        }
      }
    } catch (err) {
      console.warn('Supabase updateSample fallback:', err);
    }
  }

  return foundSample;
}

// ----------------------------------------------------------------
// API CONTRACT 10: Submit Lab Result (Definitive Diagnostic Outcome)
// ----------------------------------------------------------------
export async function submitLabResult(result: Omit<LabResult, 'id'>): Promise<LabResult> {
  const newResult: LabResult = {
    ...result,
    id: `lr-${result.sampleId}`,
  };

  if (isSupabaseConfigured()) {
    try {
      await ensureDemoUsersSeeded();

      await supabase.from('lab_results').insert({
        id: newResult.id,
        sample_id: result.sampleId,
        case_id: result.caseId,
        lab_user_id: result.labUserId,
        test_name: result.testName,
        status: result.status,
        pathogen_confirmed: result.pathogenConfirmed || null,
        serotype: result.serotype || null,
        confirmed_disease: result.confirmedDisease || null,
        ct_value: result.ctValue || null,
        notes: result.notes || null,
        completed_at: result.completedAt || new Date().toISOString(),
      });

      const nextStatus = result.status === 'positive' ? 'confirmed' : 'result_negative';
      await supabase
        .from('health_cases')
        .update({
          status: nextStatus,
          confirmed_disease: result.confirmedDisease || (result.status === 'positive' ? result.pathogenConfirmed : undefined),
          updated_at: new Date().toISOString(),
        })
        .eq('id', result.caseId);

      await supabase.from('case_events').insert({
        case_id: result.caseId,
        actor_user_id: result.labUserId,
        actor_role: 'lab_tech',
        event_type: 'LAB_RESULT_UPDATED',
        summary: `Lab Result Submitted: ${result.testName} — ${result.status.toUpperCase()}(${result.pathogenConfirmed || 'No pathogen detected'})`,
        metadata: {
          status: result.status,
          pathogen: result.pathogenConfirmed,
          serotype: result.serotype,
          ctValue: result.ctValue,
        },
      });

      if (result.status === 'positive') {
        const alertType: AlertType = 'POSITIVE_LAB_RESULT';
        await createAlert({
          alertType,
          caseId: result.caseId,
          severity: 'critical',
          title: `CONFIRMED OUTBREAK: ${result.pathogenConfirmed || result.confirmedDisease || 'Pathogen'} Detected`,
          message: `Laboratory confirmation received for Case ${result.caseId}. Ring vaccination and movement containment protocol active.`,
          targetRoles: ['veterinarian', 'gov_officer', 'paravet'],
          actionPath: `/cases/${result.caseId}`,
          actionLabel: 'View Confirmed Case',
        });
      }
    } catch (err) {
      console.warn('Supabase submitLabResult fallback:', err);
    }
  }

  const target = localCasesStore.find(c => c.id === result.caseId);
  if (target) {
    target.labResult = newResult;
    target.incidentReport.status = result.status === 'positive' ? 'confirmed' : 'result_negative';
    target.timeline.push({
      id: `tl-${result.caseId}-${Date.now()}`,
      caseId: result.caseId,
      timestamp: result.completedAt || new Date().toISOString(),
      eventType: 'lab_result',
      actorId: result.labUserId,
      actorRole: 'lab_tech',
      summary: `Lab Result Submitted: ${result.testName} — ${result.status.toUpperCase()} (${result.pathogenConfirmed || 'No pathogen'})`,
    });
  }

  return newResult;
}

// ----------------------------------------------------------------
// API CONTRACT 11: Retrieve Alerts
// ----------------------------------------------------------------
export async function retrieveAlerts(district?: string): Promise<Alert[]> {
  let dbAlerts: Alert[] = [];
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('alerts').select('*').order('created_at', { ascending: false });
      if (district) query = query.or(`target_district.eq.${district},target_district.is.null`);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        dbAlerts = data.map(a => ({
          id: a.id,
          alertType: 'EMERGING_CLUSTER' as AlertType,
          caseId: a.case_id,
          severity: a.severity,
          title: a.title,
          message: a.message,
          targetRoles: a.target_roles || [],
          targetDistrict: a.target_district,
          isRead: a.is_read || false,
          actionPath: a.action_path,
          createdAt: a.created_at,
          timestamp: a.created_at,
        }));
      }
    } catch (err) {
      console.warn('Supabase retrieveAlerts fallback:', err);
    }
  }

  const storeAlerts = useNotificationStore.getState().notifications;
  const combined = [...dbAlerts];
  const existingIds = new Set(dbAlerts.map(a => a.id));

  (storeAlerts || []).forEach(a => {
    if (!existingIds.has(a.id)) {
      combined.push(a);
      existingIds.add(a.id);
    }
  });

  if (combined.length === 0) {
    SYNTHETIC_NOTIFICATIONS.forEach(a => {
      if (!existingIds.has(a.id)) {
        combined.push(a);
        existingIds.add(a.id);
      }
    });
  }

  return combined.filter(a => {
    if (district && a.targetDistrict && a.targetDistrict !== district) return false;
    return true;
  });
}

// ----------------------------------------------------------------
// API CONTRACT 12: Create Response Action
// ----------------------------------------------------------------
export async function createResponseAction(action: Omit<ResponseAction, 'id'>): Promise<ResponseAction> {
  const newAction: ResponseAction = {
    ...action,
    id: `ca-${Date.now()}`,
  };

  const target = localCasesStore.find(c => c.id === action.caseId);
  if (target) {
    target.containmentActions = target.containmentActions || [];
    target.containmentActions.push(newAction);
  }

  return newAction;
}
