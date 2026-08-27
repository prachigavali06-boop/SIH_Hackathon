// ============================================================
// LIVESTOCK SENTINEL — AI Risk Engine Test Suite
// Member 4 — Comprehensive Deterministic Verification
// ============================================================

import {
  RiskEngine,
  type RiskAssessmentInput,
} from './aiRiskEngine';

import type {
  CaseRecord,
  Evidence,
  VaccinationCoverage,
  MovementRoute,
  GeoLocation,
} from '../types';

// ------------------------------------------------------------
// Test Mock Fixtures
// ------------------------------------------------------------

const BASE_LOCATION: GeoLocation = {
  latitude: 20.0059,
  longitude: 73.793,
  village: 'Chandori',
  block: 'Niphad',
  district: 'Nashik',
  state: 'Maharashtra',
};

const NEARBY_LOCATION: GeoLocation = {
  latitude: 20.012,
  longitude: 73.798,
  village: 'Chandori',
  block: 'Niphad',
  district: 'Nashik',
  state: 'Maharashtra',
};

const DISTANT_LOCATION: GeoLocation = {
  latitude: 19.85,
  longitude: 73.65,
  village: 'Igatpuri',
  block: 'Igatpuri',
  district: 'Nashik',
  state: 'Maharashtra',
};

function createMockCaseRecord(
  id: string,
  location: GeoLocation,
  species: 'cattle' | 'buffalo' | 'goat' = 'cattle',
  symptoms: string[] = ['fever', 'vesicles_mouth'],
  riskBand: 'low' | 'moderate' | 'high' = 'high',
  suspectedDisease: 'FMD' | 'LSD' | 'BQ' = 'FMD'
): CaseRecord {
  return {
    id,
    incidentReport: {
      id: `sr-${id}`,
      reportedBy: 'u-farmer-01',
      reporterRole: 'farmer',
      createdAt: '2026-08-25T10:00:00Z',
      updatedAt: '2026-08-25T10:00:00Z',
      species,
      totalAnimals: 10,
      affectedAnimals: 4,
      deadAnimals: 0,
      symptomIds: symptoms,
      onsetDate: '2026-08-24',
      durationDays: 2,
      location,
      isVaccinated: false,
      status: 'reported',
    },
    triageResult: {
      id: `ra-${id}`,
      caseId: id,
      incidentId: id,
      riskScore: riskBand === 'high' ? 82 : riskBand === 'moderate' ? 55 : 25,
      riskBand,
      syndromeCategory: 'Vesicular Lesion Syndrome',
      suspectedDisease,
      factors: [
        {
          factorName: 'Symptom Match',
          contribution: 25,
          evidence: 'Vesicular match',
          source: 'clinical',
          direction: 'risk',
        },
      ],
      modelVersion: 'test-v1',
      requiresVeterinaryAssessment: true,
      recommendation: 'Test recommendation',
      disclaimer: 'AI-assisted preliminary surveillance assessment — veterinary confirmation required.',
      isSynthetic: true,
      computedAt: '2026-08-25T10:00:00Z',
    },
    timeline: [],
  };
}

// ------------------------------------------------------------
// Test Runner Assertions
// ------------------------------------------------------------

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ''}`);
    testsFailed++;
  }
}

export function runAiRiskEngineTests(): { passed: number; failed: number; total: number } {
  console.log('\n======================================================');
  console.log('RUNNING AI RISK ENGINE DETERMINISTIC TEST SUITE (15 SCENARIOS)');
  console.log('======================================================\n');

  // ----------------------------------------------------------
  // Scenario 1: Isolated Low-Risk Case
  // ----------------------------------------------------------
  console.log('Scenario 1: Isolated Low-Risk Case');
  const lowRiskInput: RiskAssessmentInput = {
    caseId: 'TEST-LOW-001',
    species: 'cattle',
    totalAnimals: 20,
    affectedAnimals: 1,
    deadAnimals: 0,
    symptomIds: ['lethargy'],
    isVaccinated: true,
    vaccineNames: 'FMD Trivalent',
    location: BASE_LOCATION,
  };
  const res1 = RiskEngine.assess(lowRiskInput);
  assert(res1.riskBand === 'low', '1.1 Low risk band assigned', `Got: ${res1.riskBand} (${res1.riskScore}%)`);
  assert(res1.requiresVeterinaryAssessment === true, '1.2 Safety flag requiresVeterinaryAssessment is true');
  assert(res1.disclaimer.includes('veterinary confirmation required'), '1.3 Mandatory disclaimer present');
  assert(res1.factors.some(f => f.direction === 'protective'), '1.4 Protective factors included for vaccination');

  // ----------------------------------------------------------
  // Scenario 2: Moderate-Risk Case
  // ----------------------------------------------------------
  console.log('\nScenario 2: Moderate-Risk Case');
  const modRiskInput: RiskAssessmentInput = {
    caseId: 'TEST-MOD-001',
    species: 'cattle',
    totalAnimals: 10,
    affectedAnimals: 3,
    deadAnimals: 0,
    symptomIds: ['fever', 'skin_nodules', 'milk_drop'],
    isVaccinated: true,
    location: BASE_LOCATION,
  };
  const res2 = RiskEngine.assess(modRiskInput);
  assert(res2.riskBand === 'moderate', '2.1 Moderate risk band assigned', `Got: ${res2.riskBand} (${res2.riskScore}%)`);
  assert(res2.syndromeCategory?.includes('Nodular') === true, '2.2 Nodular syndrome categorized');
  assert(res2.suspectedDisease === 'LSD', '2.3 Suspected disease hypothesis is LSD');

  // ----------------------------------------------------------
  // Scenario 3: High-Risk Case
  // ----------------------------------------------------------
  console.log('\nScenario 3: High-Risk Case');
  const highRiskInput: RiskAssessmentInput = {
    caseId: 'TEST-HIGH-001',
    species: 'cattle',
    totalAnimals: 12,
    affectedAnimals: 8,
    deadAnimals: 2,
    symptomIds: ['vesicles_mouth', 'vesicles_feet', 'drooling', 'lameness', 'fever'],
    isVaccinated: false,
    location: BASE_LOCATION,
  };
  const res3 = RiskEngine.assess(highRiskInput);
  assert(res3.riskBand === 'high', '3.1 High risk band assigned', `Got: ${res3.riskBand} (${res3.riskScore}%)`);
  assert(res3.riskScore >= 75, '3.2 Risk score exceeds 75 threshold', `Score: ${res3.riskScore}`);
  assert(res3.syndromeCategory?.includes('Vesicular') === true, '3.3 Vesicular syndrome categorized');
  assert(res3.suspectedDisease === 'FMD', '3.4 Suspected disease hypothesis is FMD');

  // ----------------------------------------------------------
  // Scenario 4: Nearby Cases (Spatial Proximity Risk)
  // ----------------------------------------------------------
  console.log('\nScenario 4: Nearby Cases (Spatial Proximity Risk)');
  const nearbyCases = [
    createMockCaseRecord('LV-2026-00001', NEARBY_LOCATION, 'cattle', ['vesicles_mouth']),
    createMockCaseRecord('LV-2026-00002', NEARBY_LOCATION, 'cattle', ['vesicles_feet']),
  ];
  const res4 = RiskEngine.assess({
    ...modRiskInput,
    caseId: 'TEST-SPATIAL-001',
    nearbyCases,
  });
  const spatialFactor = res4.factors.find(f => f.factorName?.includes('Cluster Proximity'));
  assert(spatialFactor !== undefined, '4.1 Spatial cluster proximity factor detected');
  assert(spatialFactor?.direction === 'risk', '4.2 Spatial factor marked as risk direction');
  assert(res4.riskScore > res2.riskScore, '4.3 Score elevated due to active cases in 3km perimeter');

  // ----------------------------------------------------------
  // Scenario 5: Emerging Cluster Detection
  // ----------------------------------------------------------
  console.log('\nScenario 5: Emerging Cluster Detection');
  const clusterCases = [
    createMockCaseRecord('LV-CLUSTER-1', BASE_LOCATION, 'cattle', ['vesicles_mouth']),
    createMockCaseRecord('LV-CLUSTER-2', NEARBY_LOCATION, 'cattle', ['vesicles_feet']),
    createMockCaseRecord('LV-CLUSTER-3', { ...BASE_LOCATION, latitude: 20.008, longitude: 73.795 }, 'cattle', ['drooling']),
    createMockCaseRecord('LV-DISTANT-1', DISTANT_LOCATION, 'cattle', ['fever']),
  ];
  const clusters = RiskEngine.detectClusters(clusterCases, 3.0);
  assert(clusters.length === 1, '5.1 Exactly 1 spatial cluster detected', `Got: ${clusters.length}`);
  assert(clusters[0].caseIds.length === 3, '5.2 Cluster contains exactly the 3 neighboring cases');
  assert(!clusters[0].caseIds.includes('LV-DISTANT-1'), '5.3 Distant case excluded from cluster');
  assert(clusters[0].primaryDisease === 'FMD', '5.4 Primary cluster disease identified');

  // ----------------------------------------------------------
  // Scenario 6: Increasing Symptom Trend
  // ----------------------------------------------------------
  console.log('\nScenario 6: Increasing Symptom Trend');
  const singleSymptomCase = RiskEngine.assess({
    ...lowRiskInput,
    symptomIds: ['fever'],
  });
  const multiSymptomCase = RiskEngine.assess({
    ...lowRiskInput,
    symptomIds: ['fever', 'drooling', 'vesicles_mouth', 'vesicles_feet'],
  });
  assert(multiSymptomCase.riskScore > singleSymptomCase.riskScore, '6.1 Risk score scales monotonically with severe symptom progression');

  // ----------------------------------------------------------
  // Scenario 7: Anomalous Symptom Spike Detection
  // ----------------------------------------------------------
  console.log('\nScenario 7: Anomalous Symptom Spike Detection');
  const spikeCases = [
    createMockCaseRecord('SPIKE-1', BASE_LOCATION),
    createMockCaseRecord('SPIKE-2', BASE_LOCATION),
    createMockCaseRecord('SPIKE-3', BASE_LOCATION),
    createMockCaseRecord('SPIKE-4', BASE_LOCATION),
  ];
  const anomalies = RiskEngine.detectAnomalies(spikeCases, 7);
  const chandoriAnomaly = anomalies.find(a => a.village === 'Chandori');
  assert(chandoriAnomaly !== undefined, '7.1 Anomaly evaluated for village Chandori');
  assert(chandoriAnomaly?.isSpike === true, '7.2 Spike flag triggered (>=3 cases in village)');
  assert((chandoriAnomaly?.spikeRatio ?? 0) >= 2.0, '7.3 Spike ratio > 2.0x baseline');

  // ----------------------------------------------------------
  // Scenario 8: Low Vaccination Coverage Gap
  // ----------------------------------------------------------
  console.log('\nScenario 8: Low Vaccination Coverage Gap');
  const coverages: VaccinationCoverage[] = [
    {
      id: 'vc-01',
      district: 'Nashik',
      block: 'Niphad',
      village: 'Chandori',
      species: 'cattle',
      eligibleAnimalCount: 1000,
      vaccinatedAnimalCount: 500,
      coveragePercentage: 50.0,
      riskThresholdPercentage: 75,
      isVulnerable: true,
      vaccineType: 'FMD Bivalent',
      source: 'District Survey',
      updatedAt: '2026-08-01T00:00:00Z',
    },
  ];
  const res8 = RiskEngine.assess({
    ...modRiskInput,
    caseId: 'TEST-VACC-001',
    vaccinationCoverages: coverages,
  });
  const vaccGapFactor = res8.factors.find(f => f.factorName?.includes('Vaccination Gap'));
  assert(vaccGapFactor !== undefined, '8.1 Regional vaccination gap factor identified');
  assert(vaccGapFactor?.contribution === 12, '8.2 Gap penalty contribution added');

  // ----------------------------------------------------------
  // Scenario 9: Movement-Connected Risk (Trade Corridor)
  // ----------------------------------------------------------
  console.log('\nScenario 9: Movement-Connected Risk (Trade Corridor)');
  const routes: MovementRoute[] = [
    {
      id: 'mr-01',
      marketNodeName: 'Manmad Livestock Hub',
      sourceLocation: BASE_LOCATION,
      destinationLocation: NEARBY_LOCATION,
      routeType: 'interdistrict',
      estimatedMovementVolume: 250,
      timePeriod: 'weekly',
      confidence: 'high',
      source: 'Highway Checkpoint',
      riskLevel: 'high',
      createdAt: '2026-08-01T00:00:00Z',
    },
  ];
  const res9 = RiskEngine.assess({
    ...modRiskInput,
    caseId: 'TEST-ROUTE-001',
    movementRoutes: routes,
  });
  const corridorFactor = res9.factors.find(f => f.factorName?.includes('Trade Corridor'));
  assert(corridorFactor !== undefined, '9.1 Trade corridor exposure factor detected');
  assert(corridorFactor?.direction === 'risk', '9.2 Route marked as risk factor');

  // ----------------------------------------------------------
  // Scenario 10: Multimodal Text + Image Evidence
  // ----------------------------------------------------------
  console.log('\nScenario 10: Multimodal Text + Image Evidence');
  const textImageEvidences: Evidence[] = [
    {
      id: 'ev-1',
      caseId: 'CASE-TI',
      type: 'TEXT',
      source: 'farmer_app',
      transcript: 'Animal has severe mouth blisters and cannot chew fodder',
      createdAt: '2026-08-25T00:00:00Z',
    },
    {
      id: 'ev-2',
      caseId: 'CASE-TI',
      type: 'IMAGE',
      source: 'field_mobile_cam',
      uri: 'https://storage.sentinel/img-01.jpg',
      metadata: { detectedLesion: true, confidence: 0.88 },
      createdAt: '2026-08-25T00:00:00Z',
    },
  ];
  const res10 = RiskEngine.assess({
    ...modRiskInput,
    caseId: 'TEST-TI-001',
    evidences: textImageEvidences,
  });
  const mmFactor10 = res10.factors.find(f => f.factorName?.includes('Multimodal Evidence'));
  assert(mmFactor10 !== undefined, '10.1 Text + Image multimodal corroboration factor identified');
  assert(Boolean(mmFactor10?.value?.includes('Text') && mmFactor10?.value?.includes('Image')), '10.2 Text + Image streams indexed in factor');

  // ----------------------------------------------------------
  // Scenario 11: Multimodal Text + Voice Evidence
  // ----------------------------------------------------------
  console.log('\nScenario 11: Multimodal Text + Voice Evidence');
  const textVoiceEvidences: Evidence[] = [
    {
      id: 'ev-v1',
      caseId: 'CASE-TV',
      type: 'VOICE',
      source: 'farmer_voice_memo',
      transcript: 'Cow is drooling heavily and blisters observed on hoof',
      createdAt: '2026-08-25T00:00:00Z',
    },
    {
      id: 'ev-t1',
      caseId: 'CASE-TV',
      type: 'TEXT',
      source: 'paravet_notes',
      metadata: { notes: 'Lameness grade 3' },
      createdAt: '2026-08-25T00:00:00Z',
    },
  ];
  const res11 = RiskEngine.assess({
    ...modRiskInput,
    caseId: 'TEST-TV-001',
    evidences: textVoiceEvidences,
  });
  const mmFactor11 = res11.factors.find(f => f.factorName?.includes('Multimodal Evidence'));
  assert(mmFactor11 !== undefined, '11.1 Text + Voice multimodal corroboration factor identified');
  assert(Boolean(mmFactor11?.value?.includes('Voice')), '11.2 Voice transcript keywords matched');

  // ----------------------------------------------------------
  // Scenario 12: Multimodal Text + Voice + Image Evidence
  // ----------------------------------------------------------
  console.log('\nScenario 12: Multimodal Text + Voice + Image Evidence');
  const tripleEvidences: Evidence[] = [
    ...textImageEvidences,
    {
      id: 'ev-3',
      caseId: 'CASE-TVI',
      type: 'VOICE',
      source: 'farmer_voice',
      transcript: 'Animal has mouth ulcers and drool',
      createdAt: '2026-08-25T00:00:00Z',
    },
  ];
  const res12 = RiskEngine.assess({
    ...modRiskInput,
    caseId: 'TEST-TVI-001',
    evidences: tripleEvidences,
  });
  const mmFactor12 = res12.factors.find(f => f.factorName?.includes('Multimodal Evidence'));
  assert(mmFactor12 !== undefined, '12.1 Triple-stream multimodal fusion executed');
  assert(Boolean(mmFactor12?.value?.includes('Text') && mmFactor12?.value?.includes('Voice') && mmFactor12?.value?.includes('Image')), '12.2 Text + Voice + Image all captured in factor value');

  // ----------------------------------------------------------
  // Scenario 13: Duplicate-Report Detection
  // ----------------------------------------------------------
  console.log('\nScenario 13: Duplicate-Report Detection');
  const existingCase = createMockCaseRecord(
    'LV-EXISTING-001',
    BASE_LOCATION,
    'cattle',
    ['fever', 'vesicles_mouth', 'drooling']
  );
  const dupCheck1 = RiskEngine.detectDuplicateReports(
    {
      species: 'cattle',
      totalAnimals: 10,
      affectedAnimals: 4,
      symptomIds: ['fever', 'vesicles_mouth', 'drooling'],
      location: BASE_LOCATION,
    },
    [existingCase]
  );
  assert(dupCheck1.isLikelyDuplicate === true, '13.1 Duplicate report recognized (same species, location, symptoms)');
  assert(dupCheck1.matchingCaseId === 'LV-EXISTING-001', '13.2 Matched with correct case ID');

  const distantNewCase: RiskAssessmentInput = {
    species: 'cattle',
    totalAnimals: 10,
    affectedAnimals: 2,
    symptomIds: ['fever'],
    location: DISTANT_LOCATION,
  };
  const dupCheck2 = RiskEngine.detectDuplicateReports(distantNewCase, [existingCase]);
  assert(dupCheck2.isLikelyDuplicate === false, '13.3 Distinct distant report marked as non-duplicate');

  // ----------------------------------------------------------
  // Scenario 14: Missing Optional Evidence
  // ----------------------------------------------------------
  console.log('\nScenario 14: Missing Optional Evidence');
  const minimalInput: RiskAssessmentInput = {
    species: 'goat',
    totalAnimals: 5,
    affectedAnimals: 1,
    symptomIds: ['cough'],
    location: BASE_LOCATION,
    // evidences, nearbyCases, vaccinationCoverages, movementRoutes all undefined
  };
  const res14 = RiskEngine.assess(minimalInput);
  assert(res14.riskScore > 0, '14.1 Engine executes robustly with zero optional fields provided');
  assert(res14.factors.length > 0, '14.2 Core factors synthesized without crashing');

  // ----------------------------------------------------------
  // Scenario 15: Conflicting Evidence Handling
  // ----------------------------------------------------------
  console.log('\nScenario 15: Conflicting Evidence Handling');
  const conflictingEvidences: Evidence[] = [
    {
      id: 'ev-conf-1',
      caseId: 'CASE-CONF',
      type: 'VOICE',
      source: 'farmer_app',
      transcript: 'The animal is completely healthy and recovering well',
      createdAt: '2026-08-25T00:00:00Z',
    },
  ];
  const res15 = RiskEngine.assess({
    species: 'cattle',
    totalAnimals: 10,
    affectedAnimals: 2,
    symptomIds: ['vesicles_mouth', 'drooling'],
    location: BASE_LOCATION,
    evidences: conflictingEvidences,
  });
  const discrepancyFactor = res15.factors.find(f => f.factorName?.includes('Evidence Divergence'));
  assert(discrepancyFactor !== undefined, '15.1 Evidence divergence factor logged when voice contradicts checklist');

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED (TOTAL: ${testsPassed + testsFailed})`);
  console.log('======================================================\n');

  return { passed: testsPassed, failed: testsFailed, total: testsPassed + testsFailed };
}

// Execute tests if run directly
runAiRiskEngineTests();
