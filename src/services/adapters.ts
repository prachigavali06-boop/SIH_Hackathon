// ============================================================
// LIVESTOCK SENTINEL — External Data Adapter Interfaces
// Member 1 — Platform Core & Integration Layer
// Task 9: Provider-agnostic adapter contracts for future integration
// NOTE: These are interface contracts only. All hackathon implementations
// use MOCK data. No actual government system integration is claimed.
// ============================================================

import type { SuspectedDisease, AnimalSpecies, GeoLocation } from '../types';

// ----------------------------------------------------------------
// Base Adapter Interface
// ----------------------------------------------------------------

export interface AdapterMetadata {
  provider: string;          // e.g. "NADRES", "INAPH", "mock"
  version: string;
  lastSyncedAt?: string;
  isMock: boolean;           // Always true for hackathon
}

export interface AdapterResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: AdapterMetadata;
}

// ----------------------------------------------------------------
// Adapter 1: Disease Intelligence (NADRES / State Surveillance)
// ----------------------------------------------------------------

export interface DiseaseAlert {
  alertId: string;
  disease: SuspectedDisease | string;
  affectedDistrict: string;
  affectedBlocks?: string[];
  severity: 'low' | 'moderate' | 'high' | 'critical';
  reportedAt: string;
  source: string;
}

export interface DiseaseIntelligenceAdapter {
  getActiveAlerts(district: string): Promise<AdapterResponse<DiseaseAlert[]>>;
  getHistoricalOutbreaks(params: {
    disease?: SuspectedDisease;
    district?: string;
    fromDate: string;
    toDate: string;
  }): Promise<AdapterResponse<DiseaseAlert[]>>;
}

// ----------------------------------------------------------------
// Adapter 2: Animal Registry (INAPH / e-GOPALA)
// ----------------------------------------------------------------

export interface RegisteredAnimal {
  registrationId: string;
  tagNumber?: string;
  species: AnimalSpecies;
  breed?: string;
  ownerId: string;
  farmLocation: GeoLocation;
  lastVaccinatedAt?: string;
  registeredAt: string;
}

export interface AnimalRegistryAdapter {
  lookupAnimalByTag(tagNumber: string): Promise<AdapterResponse<RegisteredAnimal | null>>;
  getAnimalsInVillage(params: {
    village: string;
    block: string;
    district: string;
  }): Promise<AdapterResponse<RegisteredAnimal[]>>;
}

// ----------------------------------------------------------------
// Adapter 3: Weather Data Provider
// ----------------------------------------------------------------

export interface WeatherData {
  location: GeoLocation;
  timestamp: string;
  temperatureCelsius?: number;
  humidityPercent?: number;
  rainfallMm?: number;
  heatIndexRisk?: 'normal' | 'elevated' | 'high';
  vectorRisk?: 'low' | 'moderate' | 'high'; // For vector-borne disease risk
}

export interface WeatherAdapter {
  getCurrentWeather(location: Pick<GeoLocation, 'latitude' | 'longitude' | 'district'>): Promise<AdapterResponse<WeatherData>>;
  getForecast(params: {
    location: Pick<GeoLocation, 'latitude' | 'longitude' | 'district'>;
    days: number;
  }): Promise<AdapterResponse<WeatherData[]>>;
}

// ----------------------------------------------------------------
// Adapter 4: Laboratory Information System (LIMS)
// ----------------------------------------------------------------

export interface LabTestStatus {
  sampleId: string;
  barcode: string;
  testName: string;
  status: 'received' | 'processing' | 'completed' | 'rejected';
  estimatedCompletionDate?: string;
  resultAvailable: boolean;
}

export interface LabAdapter {
  getSampleStatus(barcode: string): Promise<AdapterResponse<LabTestStatus | null>>;
  submitSampleForTesting(params: {
    barcode: string;
    sampleType: string;
    tests: string[];
    caseId: string;
  }): Promise<AdapterResponse<{ trackingId: string }>>;
}

// ----------------------------------------------------------------
// Mock Implementations (for hackathon demo)
// ----------------------------------------------------------------

const MOCK_METADATA: AdapterMetadata = {
  provider: 'mock',
  version: '1.0',
  isMock: true,
  lastSyncedAt: new Date().toISOString(),
};

export const mockDiseaseIntelligenceAdapter: DiseaseIntelligenceAdapter = {
  async getActiveAlerts(district: string) {
    return {
      success: true,
      metadata: MOCK_METADATA,
      data: [
        {
          alertId: 'nadres-alert-001',
          disease: 'FMD',
          affectedDistrict: district,
          severity: 'high',
          reportedAt: new Date().toISOString(),
          source: 'Mock NADRES Adapter',
        },
      ],
    };
  },
  async getHistoricalOutbreaks({ district }) {
    return {
      success: true,
      metadata: MOCK_METADATA,
      data: [
        {
          alertId: 'nadres-hist-001',
          disease: 'LSD',
          affectedDistrict: district || 'Nashik',
          severity: 'moderate',
          reportedAt: '2025-11-15T00:00:00Z',
          source: 'Mock NADRES Historical',
        },
      ],
    };
  },
};

export const mockAnimalRegistryAdapter: AnimalRegistryAdapter = {
  async lookupAnimalByTag(tagNumber: string) {
    return {
      success: true,
      metadata: MOCK_METADATA,
      data: {
        registrationId: `inaph-${tagNumber}`,
        tagNumber,
        species: 'cattle',
        breed: 'HF Cross',
        ownerId: 'u-farmer-01',
        farmLocation: {
          latitude: 20.0059,
          longitude: 73.793,
          village: 'Chandori',
          block: 'Niphad',
          district: 'Nashik',
          state: 'Maharashtra',
        },
        registeredAt: '2024-01-10T00:00:00Z',
      },
    };
  },
  async getAnimalsInVillage({ village, district }) {
    return {
      success: true,
      metadata: MOCK_METADATA,
      data: [
        {
          registrationId: 'inaph-v01-001',
          species: 'cattle',
          ownerId: 'u-farmer-01',
          farmLocation: {
            latitude: 20.0059,
            longitude: 73.793,
            village,
            block: 'Niphad',
            district,
            state: 'Maharashtra',
          },
          registeredAt: '2024-01-10T00:00:00Z',
        },
      ],
    };
  },
};

export const mockWeatherAdapter: WeatherAdapter = {
  async getCurrentWeather(location) {
    return {
      success: true,
      metadata: MOCK_METADATA,
      data: {
        location: {
          ...location,
          village: '',
          block: '',
          state: 'Maharashtra',
        },
        timestamp: new Date().toISOString(),
        temperatureCelsius: 32.5,
        humidityPercent: 78,
        rainfallMm: 0,
        heatIndexRisk: 'elevated',
        vectorRisk: 'moderate',
      },
    };
  },
  async getForecast({ location, days }) {
    return {
      success: true,
      metadata: MOCK_METADATA,
      data: Array.from({ length: days }, (_, i) => ({
        location: { ...location, village: '', block: '', state: 'Maharashtra' },
        timestamp: new Date(Date.now() + i * 86400000).toISOString(),
        temperatureCelsius: 30 + Math.random() * 5,
        humidityPercent: 70 + Math.random() * 20,
        rainfallMm: Math.random() * 10,
      })),
    };
  },
};

export const mockLabAdapter: LabAdapter = {
  async getSampleStatus(barcode: string) {
    return {
      success: true,
      metadata: MOCK_METADATA,
      data: {
        sampleId: `smp-${barcode}`,
        barcode,
        testName: 'RT-PCR FMD Serotyping',
        status: 'processing',
        estimatedCompletionDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        resultAvailable: false,
      },
    };
  },
  async submitSampleForTesting({ barcode }) {
    return {
      success: true,
      metadata: MOCK_METADATA,
      data: { trackingId: `track-${barcode}-${Date.now()}` },
    };
  },
};
