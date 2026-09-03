// ============================================================
// LIVESTOCK SENTINEL — AI & Risk Intelligence Engine
// Member 4 — Platform Intelligence & Explainable Risk Scoring
//
// Domain Safety Notice:
// This system performs surveillance, triage, and multi-factor risk scoring.
// It DOES NOT perform autonomous veterinary diagnosis.
// Definitive diagnosis requires authorized clinical assessment or laboratory confirmation.
// ============================================================

import type {
  RiskAssessment,
  RiskFactor,
  RiskBand,
  SuspectedDisease,
  AnimalSpecies,
  GeoLocation,
  Evidence,
  VaccinationCoverage,
  MovementRoute,
  OutbreakCluster,
  CaseRecord,
  Alert,
  CaseEvent,
  UserRole,
} from '../types';

import {
  createAlert,
  addCaseEvent,
} from './platform';

// ----------------------------------------------------------------
// Public Types & Interfaces for AI Risk Engine
// ----------------------------------------------------------------

export interface RiskEngineConfig {
  modelVersion: string;
  weights: {
    clinicalSymptoms: number;    // default: 35
    herdAttackRate: number;      // default: 20
    mortalitySeverity: number;   // default: 20
    vaccinationGap: number;      // default: 15
    spatialProximity: number;    // default: 25
    movementCorridor: number;    // default: 15
    multimodalEvidence: number;  // default: 15
    environmentalSignal: number; // default: 10
  };
  thresholds: {
    highRiskScore: number;       // default: 75
    moderateRiskScore: number;   // default: 45
    clusterRadiusKm: number;     // default: 3.0
    duplicateTimeWindowHours: number; // default: 48
    duplicateDistanceKm: number; // default: 0.5
  };
}

export const DEFAULT_RISK_ENGINE_CONFIG: RiskEngineConfig = {
  modelVersion: 'sentinel-ai-risk-v2.0-prototype',
  weights: {
    clinicalSymptoms: 35,
    herdAttackRate: 20,
    mortalitySeverity: 20,
    vaccinationGap: 15,
    spatialProximity: 25,
    movementCorridor: 15,
    multimodalEvidence: 15,
    environmentalSignal: 10,
  },
  thresholds: {
    highRiskScore: 75,
    moderateRiskScore: 45,
    clusterRadiusKm: 3.0,
    duplicateTimeWindowHours: 48,
    duplicateDistanceKm: 0.5,
  },
};

export interface RiskAssessmentInput {
  caseId?: string;
  species: AnimalSpecies;
  totalAnimals: number;
  affectedAnimals: number;
  deadAnimals?: number;
  symptomIds: string[];
  isVaccinated?: boolean;
  lastVaccinationDate?: string;
  vaccineNames?: string;
  location: GeoLocation;
  onsetDate?: string;
  durationDays?: number;
  evidences?: Evidence[];
  additionalNotes?: string;
  // Contextual data inputs (optional, can be passed or fetched)
  nearbyCases?: CaseRecord[];
  vaccinationCoverages?: VaccinationCoverage[];
  movementRoutes?: MovementRoute[];
  weatherRiskLevel?: 'low' | 'moderate' | 'high';
}

export interface DuplicateCheckResult {
  isLikelyDuplicate: boolean;
  confidenceScore: number;
  matchingCaseId?: string;
  reasons: string[];
}

export interface AnomalyDetectionResult {
  village: string;
  block: string;
  district: string;
  isSpike: boolean;
  caseCount: number;
  baselineAverage: number;
  spikeRatio: number;
  primarySyndrome: string;
  message: string;
}

export interface VillageRiskProfile {
  village: string;
  block: string;
  district: string;
  activeCaseCount: number;
  highRiskCaseCount: number;
  vaccinationCoveragePercent: number;
  isVaccinationVulnerable: boolean;
  movementRouteExposure: boolean;
  compositeRiskScore: number;
  riskBand: RiskBand;
}

export interface AssessmentPipelineResult {
  assessment: RiskAssessment;
  generatedAlerts: Alert[];
  emittedEvents: CaseEvent[];
}

// ----------------------------------------------------------------
// Geodesic / Spatial Math Helper (Haversine Formula)
// ----------------------------------------------------------------

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ----------------------------------------------------------------
// Clinical Syndrome & Disease Knowledge Profiles
// ----------------------------------------------------------------

interface SyndromeDefinition {
  name: string;
  suspectedDisease: SuspectedDisease;
  applicableSpecies: AnimalSpecies[];
  keySymptoms: string[];
  secondarySymptoms: string[];
  baseSeverityWeight: number;
  recommendation: string;
}

const SYNDROME_DEFINITIONS: SyndromeDefinition[] = [
  {
    name: 'Vesicular Lesion & Stomatitis Syndrome',
    suspectedDisease: 'FMD',
    applicableSpecies: ['cattle', 'buffalo', 'sheep', 'goat', 'pig'],
    keySymptoms: ['vesicles_mouth', 'vesicles_feet', 'drooling', 'lameness'],
    secondarySymptoms: ['fever', 'anorexia', 'milk_drop'],
    baseSeverityWeight: 38,
    recommendation: 'High infectious potential. Immediate veterinary escalation, clinical isolation, and epithelial sample collection recommended.',
  },
  {
    name: 'Nodular Cutaneous Exanthema Syndrome',
    suspectedDisease: 'LSD',
    applicableSpecies: ['cattle', 'buffalo'],
    keySymptoms: ['skin_nodules', 'swelling_limbs'],
    secondarySymptoms: ['fever', 'milk_drop', 'lethargy', 'nasal_discharge'],
    baseSeverityWeight: 30,
    recommendation: 'Vector control advised. Veterinary examination for nodular staging and skin biopsy / blood sample collection recommended.',
  },
  {
    name: 'Small Ruminant Respiratory-Enteric Syndrome',
    suspectedDisease: 'PPR',
    applicableSpecies: ['sheep', 'goat'],
    keySymptoms: ['pneumonia', 'dyspnea', 'diarrhea', 'nasal_discharge'],
    secondarySymptoms: ['fever', 'vesicles_mouth', 'anorexia', 'lethargy'],
    baseSeverityWeight: 35,
    recommendation: 'High flock transmission risk. Veterinary inspection, supportive therapy, and ocular/nasal swab collection advised.',
  },
  {
    name: 'Acute Hemorrhagic / Emphysematous Syndrome',
    suspectedDisease: 'BQ',
    applicableSpecies: ['cattle', 'buffalo', 'sheep'],
    keySymptoms: ['sudden_death', 'swelling_limbs', 'lameness'],
    secondarySymptoms: ['fever', 'lethargy', 'anorexia'],
    baseSeverityWeight: 40,
    recommendation: 'Acute mortality threat. Prompt veterinary post-mortem precautions, carcass isolation, and antibiotic intervention.',
  },
  {
    name: 'Acute Septicemic / Respiratory Distress Syndrome',
    suspectedDisease: 'HS',
    applicableSpecies: ['cattle', 'buffalo'],
    keySymptoms: ['dyspnea', 'sudden_death', 'nasal_discharge', 'cough'],
    secondarySymptoms: ['fever', 'lethargy', 'drooling'],
    baseSeverityWeight: 38,
    recommendation: 'Rapid progression warning. Immediate veterinary intervention with systemic antimicrobials and herd monitoring.',
  },
  {
    name: 'Caprine Pleuropneumonic Syndrome',
    suspectedDisease: 'CCPP',
    applicableSpecies: ['goat'],
    keySymptoms: ['cough', 'dyspnea', 'pneumonia'],
    secondarySymptoms: ['fever', 'nasal_discharge', 'lethargy'],
    baseSeverityWeight: 32,
    recommendation: 'Severe contagious respiratory threat. Quarantine affected goats and conduct clinical auscultation.',
  },
  {
    name: 'Acute Sudden Mortality / Splenic Syndrome',
    suspectedDisease: 'Anthrax',
    applicableSpecies: ['cattle', 'buffalo', 'sheep', 'goat'],
    keySymptoms: ['sudden_death', 'bloody_diarrhea'],
    secondarySymptoms: ['fever', 'convulsions', 'bloat'],
    baseSeverityWeight: 45,
    recommendation: 'CRITICAL ZOONOTIC ALERT. Do not open carcass. Contact district animal health authority for strict bio-secure disposal.',
  },
  {
    name: 'Subacute Reproductive Failure Syndrome',
    suspectedDisease: 'Brucellosis',
    applicableSpecies: ['cattle', 'buffalo', 'sheep', 'goat'],
    keySymptoms: ['abortion', 'milk_drop'],
    secondarySymptoms: ['fever', 'lethargy', 'weight_loss'],
    baseSeverityWeight: 24,
    recommendation: 'Zoonotic reproductive concern. Serum agglutination / milk ring test recommended. Handle aborted tissues with PPE.',
  },
  {
    name: 'Neuro-Encephalitic / Aggressive Syndrome',
    suspectedDisease: 'Rabies',
    applicableSpecies: ['cattle', 'buffalo', 'sheep', 'goat', 'pig', 'equine', 'other'],
    keySymptoms: ['convulsions', 'head_pressing', 'aggression', 'drooling'],
    secondarySymptoms: ['sudden_death', 'anorexia'],
    baseSeverityWeight: 45,
    recommendation: 'FATAL ZOONOSIS PROTOCOL. Isolate animal immediately without direct contact. Notify district veterinary and human health officials.',
  },
];

// ----------------------------------------------------------------
// Core AI Risk Engine Implementation
// ----------------------------------------------------------------

export class RiskEngine {
  /**
   * Primary Explainable Multi-Factor Risk Assessment
   * Prototype operational risk score with deterministic explainability factors
   */
  static assess(
    input: RiskAssessmentInput,
    customConfig?: Partial<RiskEngineConfig>
  ): RiskAssessment {
    const config: RiskEngineConfig = {
      ...DEFAULT_RISK_ENGINE_CONFIG,
      ...customConfig,
      weights: {
        ...DEFAULT_RISK_ENGINE_CONFIG.weights,
        ...customConfig?.weights,
      },
      thresholds: {
        ...DEFAULT_RISK_ENGINE_CONFIG.thresholds,
        ...customConfig?.thresholds,
      },
    };

    const caseId = input.caseId || `preview-${Date.now()}`;
    const factors: RiskFactor[] = [];
    let calculatedScore = 15; // Base baseline surveillance score

    // ------------------------------------------------------------
    // 1. Clinical Syndrome Matching & Symptom Analysis
    // ------------------------------------------------------------
    let matchedSyndrome: SyndromeDefinition | null = null;
    let maxMatchScore = 0;

    for (const syndrome of SYNDROME_DEFINITIONS) {
      if (syndrome.applicableSpecies.includes(input.species)) {
        const keyMatchCount = syndrome.keySymptoms.filter(s => input.symptomIds.includes(s)).length;
        const secondaryMatchCount = syndrome.secondarySymptoms.filter(s => input.symptomIds.includes(s)).length;

        const syndromeScore = keyMatchCount * 3 + secondaryMatchCount * 1;
        if (syndromeScore > maxMatchScore) {
          maxMatchScore = syndromeScore;
          matchedSyndrome = syndrome;
        }
      }
    }

    const syndromeName = matchedSyndrome?.name || 'Undifferentiated Systemic Pattern';
    const suspectedDisease: SuspectedDisease = matchedSyndrome?.suspectedDisease || 'unknown';

    if (matchedSyndrome && maxMatchScore > 0) {
      const symptomContribution = Math.min(
        matchedSyndrome.baseSeverityWeight,
        maxMatchScore * 10 + 10
      );
      calculatedScore += symptomContribution;

      factors.push({
        factorName: 'Clinical Syndrome Match',
        contribution: symptomContribution,
        evidence: `${syndromeName} (${maxMatchScore} characteristic symptoms matched)`,
        source: 'clinical_syndrome_engine',
        direction: 'risk',
        label: 'Clinical Syndrome Match',
        value: `${syndromeName} (${maxMatchScore} symptom match)`,
        weight: symptomContribution,
      });
    } else if (input.symptomIds.length > 0) {
      const genericContribution = Math.min(20, input.symptomIds.length * 5);
      calculatedScore += genericContribution;

      factors.push({
        factorName: 'Reported Symptoms',
        contribution: genericContribution,
        evidence: `${input.symptomIds.length} generic clinical signs reported`,
        source: 'clinical_syndrome_engine',
        direction: 'risk',
        label: 'Reported Symptoms',
        value: `${input.symptomIds.length} signs present`,
        weight: genericContribution,
      });
    }

    // ------------------------------------------------------------
    // 2. Herd Attack Rate Factor
    // ------------------------------------------------------------
    const total = Math.max(1, input.totalAnimals);
    const affected = Math.min(total, Math.max(1, input.affectedAnimals));
    const attackRate = affected / total;
    const attackRatePercent = Math.round(attackRate * 100);

    let attackRateScore = 0;
    if (attackRate >= 0.5) {
      attackRateScore = 20;
    } else if (attackRate >= 0.25) {
      attackRateScore = 14;
    } else if (attackRate > 0.1) {
      attackRateScore = 8;
    } else {
      attackRateScore = 4;
    }
    calculatedScore += attackRateScore;

    factors.push({
      factorName: 'Herd Attack Rate',
      contribution: attackRateScore,
      evidence: `${affected} of ${total} animals affected in herd (${attackRatePercent}%)`,
      source: 'herd_density_analyzer',
      direction: 'risk',
      label: 'Herd Attack Rate',
      value: `${affected}/${total} affected (${attackRatePercent}%)`,
      weight: attackRateScore,
    });

    // ------------------------------------------------------------
    // 3. Mortality Severity Factor
    // ------------------------------------------------------------
    const dead = Math.max(0, input.deadAnimals || 0);
    if (dead > 0) {
      const mortalityScore = Math.min(25, 15 + dead * 4);
      calculatedScore += mortalityScore;

      factors.push({
        factorName: 'Acute Mortality Recorded',
        contribution: mortalityScore,
        evidence: `${dead} animal death(s) reported in incident`,
        source: 'mortality_signal_analyzer',
        direction: 'risk',
        label: 'Mortality Severity',
        value: `${dead} dead animal(s)`,
        weight: mortalityScore,
      });
    } else {
      factors.push({
        factorName: 'Zero Mortality',
        contribution: 5,
        evidence: 'No livestock deaths reported in herd',
        source: 'mortality_signal_analyzer',
        direction: 'protective',
        label: 'Zero Mortality',
        value: '0 deaths reported',
        weight: 5,
      });
      calculatedScore -= 5;
    }

    // ------------------------------------------------------------
    // 4. Vaccination Status & Coverage Vulnerability
    // ------------------------------------------------------------
    if (input.isVaccinated === true) {
      const vaccineProtection = 15;
      calculatedScore -= vaccineProtection;

      factors.push({
        factorName: 'Animal Vaccination Protection',
        contribution: vaccineProtection,
        evidence: `Animal vaccinated${input.vaccineNames ? ` with ${input.vaccineNames}` : ''}`,
        source: 'vaccination_registry',
        direction: 'protective',
        label: 'Vaccination Protection',
        value: input.vaccineNames || 'Vaccinated animal',
        weight: vaccineProtection,
      });
    } else {
      const unvaccPenalty = 12;
      calculatedScore += unvaccPenalty;

      factors.push({
        factorName: 'Unvaccinated Herd Vulnerability',
        contribution: unvaccPenalty,
        evidence: 'Animal has no confirmed vaccination record',
        source: 'vaccination_registry',
        direction: 'risk',
        label: 'Unvaccinated Status',
        value: 'No vaccination record (+12% risk)',
        weight: unvaccPenalty,
      });
    }

    // Check regional vaccination coverage if provided
    if (input.vaccinationCoverages && input.vaccinationCoverages.length > 0) {
      const matchingCoverage = input.vaccinationCoverages.find(
        v => v.district === input.location.district && v.species === input.species
      );
      if (matchingCoverage) {
        const threshold = matchingCoverage.riskThresholdPercentage ?? 75;
        if (matchingCoverage.coveragePercentage < threshold) {
          const gapScore = 12;
          calculatedScore += gapScore;

          factors.push({
            factorName: 'Regional Vaccination Gap',
            contribution: gapScore,
            evidence: `${matchingCoverage.district} ${matchingCoverage.species} coverage at ${matchingCoverage.coveragePercentage}% (below ${threshold}% target)`,
            source: 'vaccination_coverage_service',
            direction: 'risk',
            label: 'Regional Vaccination Gap',
            value: `${matchingCoverage.coveragePercentage}% regional coverage (< ${threshold}%)`,
            weight: gapScore,
          });
        }
      }
    }

    // ------------------------------------------------------------
    // 5. Spatial Proximity & Active Cluster Risk
    // ------------------------------------------------------------
    if (input.nearbyCases && input.nearbyCases.length > 0) {
      let casesWithin3Km = 0;
      let casesWithin10Km = 0;

      for (const nc of input.nearbyCases) {
        if (nc.id === caseId) continue;
        const dist = calculateDistanceKm(
          input.location.latitude,
          input.location.longitude,
          nc.incidentReport.location.latitude,
          nc.incidentReport.location.longitude
        );

        if (dist <= 3.0) {
          casesWithin3Km++;
        } else if (dist <= 10.0) {
          casesWithin10Km++;
        }
      }

      if (casesWithin3Km > 0) {
        const spatialScore = Math.min(25, 15 + casesWithin3Km * 4);
        calculatedScore += spatialScore;

        factors.push({
          factorName: 'Active Cluster Proximity',
          contribution: spatialScore,
          evidence: `${casesWithin3Km} active case(s) within 3.0 km epicenter radius`,
          source: 'spatial_cluster_engine',
          direction: 'risk',
          label: 'Active Cluster Proximity',
          value: `${casesWithin3Km} cases within 3km`,
          weight: spatialScore,
        });
      } else if (casesWithin10Km > 0) {
        const spatialScore = Math.min(15, 8 + casesWithin10Km * 2);
        calculatedScore += spatialScore;

        factors.push({
          factorName: 'Surrounding Incident Density',
          contribution: spatialScore,
          evidence: `${casesWithin10Km} active case(s) within 10 km district perimeter`,
          source: 'spatial_cluster_engine',
          direction: 'risk',
          label: 'Surrounding Incident Density',
          value: `${casesWithin10Km} cases in 10km`,
          weight: spatialScore,
        });
      }
    }

    // ------------------------------------------------------------
    // 6. Livestock Trade Corridor & Movement Exposure
    // ------------------------------------------------------------
    if (input.movementRoutes && input.movementRoutes.length > 0) {
      const nearTradeRoute = input.movementRoutes.find(r => {
        const distSource = calculateDistanceKm(
          input.location.latitude,
          input.location.longitude,
          r.sourceLocation.latitude,
          r.sourceLocation.longitude
        );
        const distDest = calculateDistanceKm(
          input.location.latitude,
          input.location.longitude,
          r.destinationLocation.latitude,
          r.destinationLocation.longitude
        );
        return distSource <= 15.0 || distDest <= 15.0;
      });

      if (nearTradeRoute) {
        const routeScore = nearTradeRoute.riskLevel === 'high' ? 14 : 8;
        calculatedScore += routeScore;

        factors.push({
          factorName: 'Trade Corridor Exposure',
          contribution: routeScore,
          evidence: `Located along ${nearTradeRoute.marketNodeName} corridor (${nearTradeRoute.estimatedMovementVolume} head/${nearTradeRoute.timePeriod})`,
          source: 'movement_network_analyzer',
          direction: 'risk',
          label: 'Trade Corridor Exposure',
          value: `${nearTradeRoute.marketNodeName} corridor`,
          weight: routeScore,
        });
      }
    }

    // ------------------------------------------------------------
    // 7. Multimodal Evidence Fusion (Text, Voice, Image)
    // ------------------------------------------------------------
    if (input.evidences && input.evidences.length > 0) {
      let multimodalRiskAdded = 0;
      let hasImage = false;
      let hasVoice = false;
      let hasText = false;
      let evidenceDiscrepancy = false;

      for (const ev of input.evidences) {
        if (ev.type === 'IMAGE') hasImage = true;
        if (ev.type === 'VOICE') hasVoice = true;
        if (ev.type === 'TEXT') hasText = true;

        // Transcript keyword evaluation
        if (ev.transcript) {
          const t = ev.transcript.toLowerCase();
          if (t.includes('blister') || t.includes('drool') || t.includes('slough') || t.includes('wound')) {
            multimodalRiskAdded += 8;
          }
          if (t.includes('sudden death') || t.includes('died') || t.includes('black')) {
            multimodalRiskAdded += 10;
          }
          if (t.includes('healthy') || t.includes('recovering')) {
            evidenceDiscrepancy = true;
          }
        }

        // Image metadata evaluation
        if (ev.type === 'IMAGE' && ev.metadata) {
          if (ev.metadata.detectedLesion === true || (ev.metadata.confidence && ev.metadata.confidence > 0.7)) {
            multimodalRiskAdded += 10;
          }
        }
      }

      const typesList = [
        hasText && 'Text',
        hasVoice && 'Voice',
        hasImage && 'Image',
      ].filter(Boolean).join(' + ');

      if (multimodalRiskAdded > 0) {
        const clampedEvidenceScore = Math.min(20, multimodalRiskAdded);
        calculatedScore += clampedEvidenceScore;

        factors.push({
          factorName: 'Multimodal Evidence Corroboration',
          contribution: clampedEvidenceScore,
          evidence: `Clinical signals corroborated across ${typesList} evidence stream(s)`,
          source: 'multimodal_evidence_fusion',
          direction: 'risk',
          label: 'Multimodal Corroboration',
          value: `${typesList} evidence matched`,
          weight: clampedEvidenceScore,
        });
      } else if (typesList) {
        factors.push({
          factorName: 'Multimodal Evidence Attached',
          contribution: 4,
          evidence: `${typesList} records attached and indexed in surveillance ledger`,
          source: 'multimodal_evidence_fusion',
          direction: 'protective',
          label: 'Multimodal Evidence Attached',
          value: `${typesList} indexed`,
          weight: 4,
        });
      }

      if (evidenceDiscrepancy) {
        factors.push({
          factorName: 'Evidence Divergence Note',
          contribution: 0,
          evidence: 'Voice transcript reports recovery while clinical checklist indicates active lesions',
          source: 'multimodal_evidence_fusion',
          direction: 'protective',
          label: 'Evidence Discrepancy Note',
          value: 'Transcript divergent from checklist',
          weight: 0,
        });
      }
    }

    // ------------------------------------------------------------
    // 8. Environmental / Weather Signal
    // ------------------------------------------------------------
    if (input.weatherRiskLevel) {
      if (input.weatherRiskLevel === 'high') {
        calculatedScore += 8;
        factors.push({
          factorName: 'Environmental Vector Risk',
          contribution: 8,
          evidence: 'Post-monsoon humidity & high temperature elevated vector breeding index',
          source: 'weather_adapter',
          direction: 'risk',
          label: 'Environmental Vector Risk',
          value: 'Elevated vector index',
          weight: 8,
        });
      } else if (input.weatherRiskLevel === 'moderate') {
        calculatedScore += 4;
        factors.push({
          factorName: 'Seasonal Weather Pattern',
          contribution: 4,
          evidence: 'Moderate seasonal risk condition in district',
          source: 'weather_adapter',
          direction: 'risk',
          label: 'Seasonal Weather Pattern',
          value: 'Moderate seasonal risk',
          weight: 4,
        });
      }
    }

    // ------------------------------------------------------------
    // Final Normalization & Risk Band Assignment
    // ------------------------------------------------------------
    const finalScore = Math.max(5, Math.min(95, Math.round(calculatedScore)));

    let riskBand: RiskBand = 'low';
    if (finalScore >= config.thresholds.highRiskScore) {
      riskBand = 'high';
    } else if (finalScore >= config.thresholds.moderateRiskScore) {
      riskBand = 'moderate';
    }

    // Recommendation synthesis
    const recommendation =
      riskBand === 'high'
        ? `${matchedSyndrome?.recommendation || 'High risk profile detected.'} Priority veterinary visit and cold-chain sample collection strongly advised.`
        : riskBand === 'moderate'
        ? `${matchedSyndrome?.recommendation || 'Moderate risk profile.'} Schedule clinical veterinary assessment and monitor herd twice daily.`
        : 'Low preliminary risk. Continue standard biosecurity, update local vaccination records, and report any symptom changes.';

    const mandatoryDisclaimer =
      'AI-assisted preliminary surveillance assessment — veterinary confirmation required. This prototype operational risk score provides triage recommendations and does not constitute a definitive medical or epidemiological diagnosis.';

    return {
      id: `ra-${caseId}`,
      caseId,
      riskScore: finalScore,
      riskBand,
      syndromeCategory: syndromeName,
      suspectedDisease,
      factors,
      modelVersion: config.modelVersion,
      requiresVeterinaryAssessment: true, // MANDATORY SAFETY ENFORCEMENT
      recommendation,
      disclaimer: mandatoryDisclaimer,
      isSynthetic: true,
      computedAt: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------
  // Dynamic Spatio-Temporal Cluster Detection (Haversine Grid)
  // --------------------------------------------------------------
  static detectClusters(
    cases: CaseRecord[],
    radiusKm: number = DEFAULT_RISK_ENGINE_CONFIG.thresholds.clusterRadiusKm
  ): OutbreakCluster[] {
    const activeCases = cases.filter(
      c => c.incidentReport.status !== 'closed' && c.incidentReport.status !== 'contained'
    );

    const visited = new Set<string>();
    const clusters: OutbreakCluster[] = [];

    for (let i = 0; i < activeCases.length; i++) {
      const rootCase = activeCases[i];
      if (visited.has(rootCase.id)) continue;

      const group: CaseRecord[] = [rootCase];
      visited.add(rootCase.id);

      for (let j = 0; j < activeCases.length; j++) {
        if (i === j) continue;
        const otherCase = activeCases[j];
        if (visited.has(otherCase.id)) continue;

        const dist = calculateDistanceKm(
          rootCase.incidentReport.location.latitude,
          rootCase.incidentReport.location.longitude,
          otherCase.incidentReport.location.latitude,
          otherCase.incidentReport.location.longitude
        );

        if (dist <= radiusKm) {
          group.push(otherCase);
          visited.add(otherCase.id);
        }
      }

      // If group has 2 or more cases within radius, form cluster
      if (group.length >= 2) {
        const centerLat =
          group.reduce((acc, c) => acc + c.incidentReport.location.latitude, 0) / group.length;
        const centerLon =
          group.reduce((acc, c) => acc + c.incidentReport.location.longitude, 0) / group.length;

        // Disease frequency
        const diseaseCount: Record<string, number> = {};
        const blocksSet = new Set<string>();
        let hasHighRisk = false;

        for (const c of group) {
          const disease = c.triageResult?.suspectedDisease || 'unknown';
          diseaseCount[disease] = (diseaseCount[disease] || 0) + 1;
          if (c.incidentReport.location.block) blocksSet.add(c.incidentReport.location.block);
          if (c.triageResult?.riskBand === 'high' || c.triageResult?.riskBand === 'critical') {
            hasHighRisk = true;
          }
        }

        let primaryDisease: SuspectedDisease = 'FMD';
        let maxCount = 0;
        for (const [dis, count] of Object.entries(diseaseCount)) {
          if (count > maxCount) {
            maxCount = count;
            primaryDisease = dis as SuspectedDisease;
          }
        }

        const district = group[0].incidentReport.location.district || 'Nashik';
        const clusterId = `cluster-${district.toLowerCase().replace(/\s+/g, '-')}-${clusters.length + 1}`;

        clusters.push({
          id: clusterId,
          clusterName: `${district} ${primaryDisease} Cluster (${group.length} cases)`,
          centerLatitude: Number(centerLat.toFixed(6)),
          centerLongitude: Number(centerLon.toFixed(6)),
          radiusMeters: Math.round(radiusKm * 1000),
          caseIds: group.map(c => c.id),
          primaryDisease,
          affectedDistrict: district,
          affectedBlocks: Array.from(blocksSet),
          riskLevel: hasHighRisk || group.length >= 4 ? 'high' : 'moderate',
          activeCaseCount: group.length,
          detectedAt: new Date().toISOString(),
          status: 'active',
        });
      }
    }

    return clusters;
  }

  // --------------------------------------------------------------
  // Local Spatio-Temporal Anomaly & Symptom Spike Detection
  // --------------------------------------------------------------
  static detectAnomalies(
    cases: CaseRecord[],
    _timeWindowDays: number = 7
  ): AnomalyDetectionResult[] {
    const villageGroups: Record<string, { cases: CaseRecord[]; block: string; district: string }> = {};

    for (const c of cases) {
      const v = c.incidentReport.location.village || 'Unknown Village';
      if (!villageGroups[v]) {
        villageGroups[v] = {
          cases: [],
          block: c.incidentReport.location.block || '',
          district: c.incidentReport.location.district || '',
        };
      }
      villageGroups[v].cases.push(c);
    }

    const results: AnomalyDetectionResult[] = [];

    for (const [village, info] of Object.entries(villageGroups)) {
      const totalCases = info.cases.length;
      // Synthetic baseline is 1.2 cases per week for a typical rural village
      const baseline = 1.2;
      const spikeRatio = Number((totalCases / baseline).toFixed(2));
      const isSpike = totalCases >= 3 && spikeRatio >= 2.0;

      const primarySyndrome =
        info.cases[0]?.triageResult?.syndromeCategory || 'Vesicular Disease Pattern';

      results.push({
        village,
        block: info.block,
        district: info.district,
        isSpike,
        caseCount: totalCases,
        baselineAverage: baseline,
        spikeRatio,
        primarySyndrome,
        message: isSpike
          ? `Anomalous symptom spike detected in ${village}: ${totalCases} reports (${spikeRatio}x above baseline)`
          : `Incidence within normal baseline in ${village}`,
      });
    }

    return results;
  }

  // --------------------------------------------------------------
  // Duplicate Report Detection
  // --------------------------------------------------------------
  static detectDuplicateReports(
    newCase: RiskAssessmentInput,
    existingCases: CaseRecord[],
    windowHours: number = DEFAULT_RISK_ENGINE_CONFIG.thresholds.duplicateTimeWindowHours,
    distanceKm: number = DEFAULT_RISK_ENGINE_CONFIG.thresholds.duplicateDistanceKm
  ): DuplicateCheckResult {
    const reasons: string[] = [];
    const nowMs = Date.now();
    const windowMs = windowHours * 60 * 60 * 1000;

    for (const ec of existingCases) {
      // FIX 2: Enforce the configured time window using incidentReport.createdAt
      const caseCreatedAt = new Date(ec.incidentReport.createdAt).getTime();
      if (isNaN(caseCreatedAt) || nowMs - caseCreatedAt > windowMs) {
        continue; // Skip cases outside the time window
      }

      const dist = calculateDistanceKm(
        newCase.location.latitude,
        newCase.location.longitude,
        ec.incidentReport.location.latitude,
        ec.incidentReport.location.longitude
      );

      const sameSpecies = newCase.species === ec.incidentReport.species;
      const sameVillage =
        newCase.location.village?.toLowerCase() ===
        ec.incidentReport.location.village?.toLowerCase();

      // Symptom Jaccard similarity
      const s1 = new Set(newCase.symptomIds);
      const s2 = new Set(ec.incidentReport.symptomIds);
      const intersection = [...s1].filter(x => s2.has(x)).length;
      const union = new Set([...s1, ...s2]).size;
      const jaccard = union > 0 ? intersection / union : 0;

      // FIX 1: Lower geo-path Jaccard threshold from 0.5 → 0.4
      // Rationale: 2 matching symptoms out of 5 (e.g. fever + vesicles_mouth) = Jaccard 0.4,
      // which is sufficient to warrant a duplicate warning when GPS and species also match.
      if (dist <= distanceKm && sameSpecies && jaccard >= 0.4) {
        reasons.push(
          `Matching case ${ec.id} located ${Math.round(dist * 1000)}m away with ${Math.round(jaccard * 100)}% symptom overlap`
        );

        return {
          isLikelyDuplicate: true,
          confidenceScore: Number((0.6 + jaccard * 0.4).toFixed(2)),
          matchingCaseId: ec.id,
          reasons,
        };
      }

      if (sameVillage && sameSpecies && jaccard >= 0.75) {
        reasons.push(
          `Identical species (${newCase.species}) in village ${newCase.location.village} with ${Math.round(jaccard * 100)}% identical symptoms`
        );

        return {
          isLikelyDuplicate: true,
          confidenceScore: 0.85,
          matchingCaseId: ec.id,
          reasons,
        };
      }
    }

    return {
      isLikelyDuplicate: false,
      confidenceScore: 0.0,
      reasons: ['No duplicate reports identified within spatial-temporal window'],
    };
  }

  // --------------------------------------------------------------
  // Village / Block Operational Risk Profiles
  // --------------------------------------------------------------
  static calculateVillageRiskProfiles(
    cases: CaseRecord[],
    coverages: VaccinationCoverage[],
    routes: MovementRoute[]
  ): VillageRiskProfile[] {
    const villageData: Record<
      string,
      {
        village: string;
        block: string;
        district: string;
        cases: CaseRecord[];
      }
    > = {};

    for (const c of cases) {
      const v = c.incidentReport.location.village || 'Chandori';
      if (!villageData[v]) {
        villageData[v] = {
          village: v,
          block: c.incidentReport.location.block || 'Niphad',
          district: c.incidentReport.location.district || 'Nashik',
          cases: [],
        };
      }
      villageData[v].cases.push(c);
    }

    const profiles: VillageRiskProfile[] = [];

    for (const [village, info] of Object.entries(villageData)) {
      const activeCount = info.cases.length;
      const highRiskCount = info.cases.filter(
        c => c.triageResult?.riskBand === 'high' || c.triageResult?.riskBand === 'critical'
      ).length;

      // Find vaccination coverage
      const cov = coverages.find(v => v.village === village || v.block === info.block);
      const covPercent = cov ? cov.coveragePercentage : 65.0;
      const isVaccVulnerable = covPercent < 75.0;

      // Trade route intersection
      const nearRoute = routes.some(
        r => r.sourceLocation.village === village || r.destinationLocation.village === village
      );

      let score = activeCount * 15 + highRiskCount * 20;
      if (isVaccVulnerable) score += 20;
      if (nearRoute) score += 15;

      const compositeScore = Math.max(10, Math.min(95, score));
      let band: RiskBand = 'low';
      if (compositeScore >= 75) band = 'high';
      else if (compositeScore >= 45) band = 'moderate';

      profiles.push({
        village,
        block: info.block,
        district: info.district,
        activeCaseCount: activeCount,
        highRiskCaseCount: highRiskCount,
        vaccinationCoveragePercent: covPercent,
        isVaccinationVulnerable: isVaccVulnerable,
        movementRouteExposure: nearRoute,
        compositeRiskScore: compositeScore,
        riskBand: band,
      });
    }

    return profiles;
  }

  // --------------------------------------------------------------
  // Full Orchestration Pipeline (Risk Assessment + Event + Alert)
  // --------------------------------------------------------------
  static async assessWithPipeline(
    input: RiskAssessmentInput,
    actorRole: UserRole = 'farmer',
    actorUserId: string = 'system'
  ): Promise<AssessmentPipelineResult> {
    // 1. Compute assessment
    const assessment = RiskEngine.assess(input);
    const generatedAlerts: Alert[] = [];
    const emittedEvents: CaseEvent[] = [];

    const caseId = input.caseId || assessment.caseId;

    // 2. Emit CaseEvent: RISK_ASSESSED
    try {
      const event = await addCaseEvent({
        caseId,
        actorRole,
        actorUserId,
        eventType: 'RISK_ASSESSED',
        summary: `AI Risk Score: ${assessment.riskScore}% (${assessment.riskBand}). Syndrome: ${assessment.syndromeCategory}.`,
        metadata: {
          riskScore: assessment.riskScore,
          riskBand: assessment.riskBand,
          suspectedDisease: assessment.suspectedDisease,
          factorsCount: assessment.factors.length,
        },
      });
      emittedEvents.push(event);
    } catch (e) {
      console.warn('Pipeline addCaseEvent skipped in mock/offline mode:', e);
    }

    // 3. Trigger High Risk Alert if score >= 75
    if (assessment.riskBand === 'high' || assessment.riskScore >= 75) {
      try {
        const alert = await createAlert({
          alertType: 'HIGH_RISK_CASE',
          caseId,
          severity: 'danger',
          title: `High Risk Incident Triage: ${assessment.suspectedDisease || 'Livestock Alert'}`,
          message: `Case ${caseId} in ${input.location.village}, ${input.location.district} evaluated at ${assessment.riskScore}% risk. ${assessment.recommendation}`,
          targetRoles: ['veterinarian', 'government_officer'],
          targetDistrict: input.location.district,
          location: input.location,
          actionPath: `/cases/${caseId}`,
          actionLabel: 'Review & Assign Vet',
        });
        generatedAlerts.push(alert);
      } catch (e) {
        console.warn('Pipeline createAlert skipped in mock/offline mode:', e);
      }
    }

    return {
      assessment,
      generatedAlerts,
      emittedEvents,
    };
  }
}
