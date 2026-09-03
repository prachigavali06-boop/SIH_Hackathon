// ============================================================
// LIVESTOCK SENTINEL — Global Multilingual Hook & State Store
// Lightweight Zustand Store with Persistence & Deep Key Resolution
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, type Language } from './translations';


interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string, fallback?: string) => string;
}

// Deep key resolver with English fallback
function resolveTranslation(lang: Language, keyPath: string, customFallback?: string): string {
  const keys = keyPath.split('.');

  // 1. Try selected language
  let current: any = (translations as any)[lang];
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      current = undefined;
      break;
    }
  }
  if (typeof current === 'string' && current.trim().length > 0) {
    return current;
  }

  // 2. Fallback to English
  if (lang !== 'en') {
    let enCurrent: any = (translations as any)['en'];
    for (const k of keys) {
      if (enCurrent && typeof enCurrent === 'object' && k in enCurrent) {
        enCurrent = enCurrent[k];
      } else {
        enCurrent = undefined;
        break;
      }
    }
    if (typeof enCurrent === 'string' && enCurrent.trim().length > 0) {
      return enCurrent;
    }
  }

  // 3. Fallback to custom fallback or key path itself
  return customFallback !== undefined ? customFallback : keyPath;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'en',
      setLanguage: (language: Language) => set({ language }),
      t: (keyPath: string, fallback?: string) => {
        return resolveTranslation(get().language, keyPath, fallback);
      },
    }),
    {
      name: 'sentinel-language',
    }
  )
);

// React Hook
export function useLanguage() {
  const language = useLanguageStore(state => state.language);
  const setLanguage = useLanguageStore(state => state.setLanguage);
  const t = useLanguageStore(state => state.t);
  const isLocalized = language !== 'en';

  // Helper translations for common entities
  const tSpecies = (sp: string): string => {
    return t(`common.${sp.toLowerCase()}`, sp);
  };

  const tRiskBand = (risk: string): string => {
    return t(`common.${risk.toLowerCase()}`, risk);
  };

  const tCaseStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      reported: 'common.reported',
      triaged: 'common.triaged',
      vet_assigned: 'common.vetAssigned',
      vet_assessed: 'common.vetAssessed',
      sample_collected: 'common.sampleCollected',
      sample_dispatched: 'common.sampleDispatched',
      sample_received: 'common.sampleReceived',
      lab_processing: 'common.labProcessing',
      result_pending: 'common.pending',
      result_positive: 'common.positive',
      result_negative: 'common.negative',
      confirmed: 'common.confirmed',
      contained: 'common.contained',
      closed: 'common.closed',
    };
    return statusMap[status] ? t(statusMap[status], status) : status;
  };

  const tRole = (role: string): string => {
    return t(`roles.${role}`, role);
  };

  return {
    language,
    setLanguage,
    isLocalized,
    t,
    tSpecies,
    tRiskBand,
    tCaseStatus,
    tRole,
  };
}
