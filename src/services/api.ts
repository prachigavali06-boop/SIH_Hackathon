// ============================================================
// LIVESTOCK SENTINEL — Unified Service & API Contracts Layer
// Member 1 — Backend & System Integration Foundation
// Pre-Merge Safety Review Compliant: Triage & Risk Scoring Only
// ============================================================

import { supabase, isSupabaseConfigured } from './supabase';
import type {
  HealthCase, SymptomReport, RiskAssessment, OutbreakCluster,
  VetAssignment, FieldVisit, Sample, LabResult, Alert,
  ResponseAction, CaseRecord, IncidentReport, VetAssessment,
  TimelineEvent, RiskBand, CaseStatus, AnimalSpecies, UserRole,
  VaccinationRecord, TreatmentRecord
} from '../types';
import { generateCanonicalCaseId } from '../types';
import { SYNTHETIC_CASES, SYNTHETIC_NOTIFICATIONS } from '../data/seed';
import { enqueueOfflineAction, getUnsyncedOfflineItems, markItemSynced } from './offlineQueue';

// In-Memory store fallback for hackathon offline demo mode
let localCasesStore: CaseRecord[] = [...SYNTHETIC_CASES];
let localAlertsStore: Alert[] = [...SYNTHETIC_NOTIFICATIONS];

const MANDATORY_SAFETY_DISCLAIMER =
  'This is an AI-assisted risk assessment based on reported symptoms. It is NOT a definitive diagnosis. Veterinary confirmation is mandatory before any official action.';

// Helper to construct CaseRecord from raw components
function buildCaseRecord(
  hc: Partial<HealthCase>,
  sr?: Partial<SymptomReport>,
  ra?: Partial<RiskAssessment>,
  va?: Partial<VetAssessment>,
  smp?: Partial<Sample>,
  lr?: Partial<LabResult>,
  ca?: ResponseAction[]
): CaseRecord {
  const caseId = hc.id || generateCanonicalCaseId(Math.floor(Math.random() * 1000));
  const createdAt = hc.createdAt || new Date().toISOString();

  const incidentReport: IncidentReport = {
    id: sr?.id || `sr-${caseId}`,
    reportedBy: hc.reportedByUserId || 'u-farmer-01',
    reporterRole: hc.reporterRole || 'farmer',
    createdAt,
    updatedAt: hc.updatedAt || createdAt,
    species: hc.primarySpecies || 'cattle',
    totalAnimals: hc.totalAnimalsInHerd || 10,
    affectedAnimals: hc.affectedAnimalCount || 1,
    deadAnimals: hc.deadAnimalCount || 0,
    symptomIds: sr?.symptomIds || ['fever'],
    onsetDate: sr?.onsetDate || new Date().toISOString().split('T')[0],
    durationDays: sr?.durationDays || 1,
    additionalNotes: sr?.additionalNotes,
    location: {
      latitude: hc.latitude || 20.0059,
      longitude: hc.longitude || 73.7930,
      village: hc.village || 'Chandori',
      block: hc.block || 'Niphad',
      district: hc.district || 'Nashik',
      state: hc.state || 'Maharashtra',
    },
    isVaccinated: false,
    status: hc.status || 'reported',
  };

  const timeline: TimelineEvent[] = [
    {
      id: `tl-${caseId}-1`,
      caseId,
      timestamp: createdAt,
      eventType: 'incident_reported',
      actorId: hc.reportedByUserId || 'u-farmer-01',
      actorRole: hc.reporterRole || 'farmer',
      summary: `Incident reported. Canonical Case ID: ${caseId}`,
    },
  ];

  if (ra && ra.riskScore !== undefined) {
    timeline.push({
      id: `tl-${caseId}-2`,
      caseId,
      timestamp: ra.computedAt || createdAt,
      eventType: 'triage_completed',
      actorId: 'system',
      actorRole: 'admin',
      summary: `AI Risk Score: ${ra.riskScore}% (${ra.riskBand || 'low'}). Requires Veterinary Assessment.`,
    });
  }

  const triageResult = ra && ra.riskScore !== undefined ? {
    id: ra.id || `ra-${caseId}`,
    caseId,
    incidentId: caseId,
    riskScore: ra.riskScore,
    riskBand: ra.riskBand || 'low',
    syndromeCategory: ra.syndromeCategory || 'Vesicular/Respiratory Syndrome',
    suspectedDisease: ra.suspectedDisease,
    factors: ra.factors || [],
    recommendation: ra.recommendation || 'Veterinary assessment recommended.',
    requiresVeterinaryAssessment: true,
    disclaimer: ra.disclaimer || MANDATORY_SAFETY_DISCLAIMER,
    modelVersion: ra.modelVersion || 'v1',
    isSynthetic: ra.isSynthetic ?? true,
    computedAt: ra.computedAt || createdAt,
  } : undefined;

  const vetAssessment: VetAssessment | undefined = va && va.vetId ? {
    vetId: va.vetId,
    assessedAt: va.assessedAt || createdAt,
    clinicalFindings: va.clinicalFindings || '',
    agreedWithAiRisk: va.agreedWithAiRisk ?? true,
    revisedRiskBand: va.revisedRiskBand,
    clinicalDiagnosis: va.clinicalDiagnosis,
    requiresSample: va.requiresSample ?? true,
    treatmentRecommended: va.treatmentRecommended,
    quarantineRecommended: va.quarantineRecommended ?? false,
    notes: va.notes,
  } : undefined;

  const sampleCollection = smp ? {
    id: smp.id || `smp-${caseId}`,
    caseId,
    barcode: smp.barcode || `SNT-${caseId}`,
    sampleType: smp.sampleType || 'Blood Serum',
    collectedByUserId: smp.collectedByUserId || 'u-paravet-01',
    collectedBy: smp.collectedByUserId || 'u-paravet-01',
    collectedAt: smp.collectedAt || createdAt,
    animalCountSampled: smp.animalCountSampled || 1,
    animalCount: smp.animalCountSampled || 1,
    destinationLabName: smp.destinationLabName || 'NRFMD Lab',
    destinationLab: smp.destinationLabName || 'NRFMD Lab',
    dispatchedAt: smp.dispatchedAt,
    receivedAt: smp.receivedAt,
    sampleId: smp.id || `smp-${caseId}`,
    chainOfCustody: smp.chainOfCustody || [],
  } : undefined;

  const labResult: LabResult | undefined = lr && lr.testName ? {
    id: lr.id || `lr-${caseId}`,
    sampleId: lr.sampleId || `smp-${caseId}`,
    caseId,
    labUserId: lr.labUserId || 'u-lab-01',
    techId: lr.labUserId || 'u-lab-01',
    labId: 'lab-nrfmd-01',
    testName: lr.testName,
    status: lr.status || 'pending',
    pathogenConfirmed: lr.pathogenConfirmed,
    pathogen: lr.pathogenConfirmed,
    serotype: lr.serotype,
    confirmedDisease: lr.confirmedDisease,
    ctValue: lr.ctValue,
    notes: lr.notes,
    completedAt: lr.completedAt || createdAt,
  } : undefined;

  return {
    id: caseId,
    incidentReport,
    triageResult,
    assignedVetId: hc.assignedVetUserId,
    vetAssessment,
    sampleCollection,
    labResult,
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
}): Promise<{ caseId: string; record: CaseRecord }> {
  const sequenceNum = localCasesStore.length + 1;
  const canonicalId = generateCanonicalCaseId(sequenceNum);

  if (isSupabaseConfigured()) {
    try {
      const { error: hcError } = await supabase
        .from('health_cases')
        .insert({
          id: canonicalId,
          reported_by_user_id: payload.reportedByUserId,
          reporter_role: payload.reporterRole,
          status: 'reported',
          risk_band: 'low',
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
        });

      if (hcError) throw hcError;

      await supabase.from('symptom_reports').insert({
        case_id: canonicalId,
        symptom_ids: payload.symptomIds,
        onset_date: payload.onsetDate,
        duration_days: payload.durationDays,
        additional_notes: payload.additionalNotes,
      });
    } catch (err) {
      console.warn('Supabase createCase fallback to local store:', err);
    }
  }

  // Build local record
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
      riskBand: 'low',
    },
    {
      symptomIds: payload.symptomIds,
      onsetDate: payload.onsetDate,
      durationDays: payload.durationDays,
      additionalNotes: payload.additionalNotes,
    }
  );

  localCasesStore = [newRecord, ...localCasesStore];
  return { caseId: canonicalId, record: newRecord };
}

// ----------------------------------------------------------------
// API CONTRACT 2: Get Cases
// ----------------------------------------------------------------
export async function getCases(filters?: {
  district?: string;
  riskBand?: RiskBand;
  status?: CaseStatus;
}): Promise<CaseRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('health_cases').select('*');
      if (filters?.district) query = query.eq('district', filters.district);
      if (filters?.riskBand) query = query.eq('risk_band', filters.riskBand);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      if (data && data.length > 0) {
        return data.map(item => buildCaseRecord({
          id: item.id,
          primarySpecies: item.primary_species,
          status: item.status,
          riskBand: item.risk_band,
          district: item.district,
          village: item.village,
          latitude: item.latitude,
          longitude: item.longitude,
        }));
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
// API CONTRACT 3: Get Case By ID
// ----------------------------------------------------------------
export async function getCaseById(caseId: string): Promise<CaseRecord | null> {
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
        .update({ risk_band: assessment.riskBand, status: 'triaged' })
        .eq('id', assessment.caseId);
    } catch (err) {
      console.warn('Supabase submitRiskAssessment fallback:', err);
    }
  }

  return newAssessment;
}

// ----------------------------------------------------------------
// API CONTRACT 5: Retrieve Clusters
// ----------------------------------------------------------------
export async function retrieveClusters(district?: string): Promise<OutbreakCluster[]> {
  const clusters: OutbreakCluster[] = [
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

  if (district) return clusters.filter(c => c.affectedDistrict === district);
  return clusters;
}

// ----------------------------------------------------------------
// API CONTRACT 6: Assign Veterinarian
// ----------------------------------------------------------------
export async function assignVeterinarian(caseId: string, vetUserId: string, assignedByUserId: string): Promise<VetAssignment> {
  const assignment: VetAssignment = {
    id: `va-${caseId}`,
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

    // Update affected/dead if specified
    if (visit.affectedCount !== undefined) {
      target.incidentReport.affectedAnimals = visit.affectedCount;
    }
    if (visit.mortality !== undefined) {
      target.incidentReport.deadAnimals = visit.mortality;
    }

    // Add timeline event
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
  const barcode = `SNT-${sample.caseId.replace(/[^0-9]/g, '')}`;
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
// API CONTRACT 8F: Sync Offline Queue to Local Store
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
  for (const c of localCasesStore) {
    if (c.sampleCollection && c.sampleCollection.id === sampleId) {
      c.sampleCollection.chainOfCustody.push({
        step,
        timestamp: new Date().toISOString(),
        handledBy,
        notes,
      });
      return c.sampleCollection as any;
    }
  }
  return null;
}

// ----------------------------------------------------------------
// API CONTRACT 10: Submit Lab Result (Definitive Diagnostic Outcome)
// ----------------------------------------------------------------
export async function submitLabResult(result: Omit<LabResult, 'id'>): Promise<LabResult> {
  const newResult: LabResult = {
    ...result,
    id: `lr-${result.sampleId}`,
  };

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
  return localAlertsStore.filter(a => {
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
