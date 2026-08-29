// ============================================================
// LIVESTOCK SENTINEL — Offline Storage & Sync Queue Service
// Member 2 — Farmer & Field Reporting (IndexedDB via idb)
// ============================================================

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  SyncMetadata,
  SyncStatus,
  UserRole,
  AnimalSpecies,
  GeoLocation,
  CaseRecord,
} from '../types';
import { generateCanonicalCaseId } from '../types';
import { createCase } from './api';
import { addEvidence, buildSyncMetadata, markSynced, markSyncFailed } from './platform';

export interface OfflineIncidentPayload {
  localId: string;
  canonicalCaseId: string;
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
  location: GeoLocation;
  isVaccinated: boolean;
  vaccineNames?: string;
  createdAt: string;
  evidences: Array<{
    type: 'TEXT' | 'VOICE' | 'IMAGE';
    source: string;
    uri?: string;
    transcript?: string;
    metadata?: Record<string, any>;
  }>;
  syncMetadata: SyncMetadata;
}

interface SentinelDB extends DBSchema {
  offline_incidents: {
    key: string;
    value: OfflineIncidentPayload;
    indexes: {
      'by-status': SyncStatus;
      'by-created': string;
    };
  };
}

const DB_NAME = 'livestock-sentinel-offline-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SentinelDB>> | null = null;

function getDB(): Promise<IDBPDatabase<SentinelDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SentinelDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('offline_incidents')) {
          const store = db.createObjectStore('offline_incidents', {
            keyPath: 'localId',
          });
          store.createIndex('by-status', 'syncMetadata.syncStatus');
          store.createIndex('by-created', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

// ----------------------------------------------------------------
// Sync Event Listeners & Status Dispatcher
// ----------------------------------------------------------------

type SyncQueueListener = (pendingCount: number, isOnline: boolean) => void;
const listeners: Set<SyncQueueListener> = new Set();

export function subscribeToSyncEvents(listener: SyncQueueListener): () => void {
  listeners.add(listener);
  // Initial notification
  getPendingSyncCount().then(count => {
    listener(count, typeof navigator !== 'undefined' ? navigator.onLine : true);
  });

  return () => {
    listeners.delete(listener);
  };
}

async function notifyListeners(): Promise<void> {
  const count = await getPendingSyncCount();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  for (const listener of listeners) {
    try {
      listener(count, isOnline);
    } catch (err) {
      console.warn('Sync listener error:', err);
    }
  }
}

// Initialize online/offline window listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    notifyListeners();
    // Auto-sync when internet connection is restored
    syncOfflineQueue().catch(err => console.warn('Auto-sync failed:', err));
  });

  window.addEventListener('offline', () => {
    notifyListeners();
  });
}

// ----------------------------------------------------------------
// Public Offline Queue API
// ----------------------------------------------------------------

let isSyncing = false;

/**
 * Save an incident report locally in IndexedDB when offline
 */
export async function saveOfflineIncident(params: {
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
  location: GeoLocation;
  isVaccinated: boolean;
  vaccineNames?: string;
  evidences?: Array<{
    type: 'TEXT' | 'VOICE' | 'IMAGE';
    source: string;
    uri?: string;
    transcript?: string;
    metadata?: Record<string, any>;
  }>;
}): Promise<OfflineIncidentPayload> {
  const db = await getDB();
  const timestamp = Date.now();
  const localId = `offline-inc-${timestamp}-${Math.floor(Math.random() * 1000)}`;
  const canonicalCaseId = generateCanonicalCaseId(Math.floor(500 + Math.random() * 500));

  const syncMetadata = buildSyncMetadata({
    localId,
    syncStatus: 'PENDING',
    createdOffline: true,
    syncAttempts: 0,
  });

  const payload: OfflineIncidentPayload = {
    localId,
    canonicalCaseId,
    reportedByUserId: params.reportedByUserId,
    reporterRole: params.reporterRole,
    primarySpecies: params.primarySpecies,
    totalAnimalsInHerd: params.totalAnimalsInHerd,
    affectedAnimalCount: params.affectedAnimalCount,
    deadAnimalCount: params.deadAnimalCount,
    symptomIds: params.symptomIds,
    onsetDate: params.onsetDate,
    durationDays: params.durationDays,
    additionalNotes: params.additionalNotes,
    location: params.location,
    isVaccinated: params.isVaccinated,
    vaccineNames: params.vaccineNames,
    createdAt: new Date().toISOString(),
    evidences: params.evidences || [],
    syncMetadata,
  };

  await db.put('offline_incidents', payload);
  await notifyListeners();

  return payload;
}

/**
 * Retrieve all offline-stored incidents
 */
export async function getOfflineIncidents(): Promise<OfflineIncidentPayload[]> {
  const db = await getDB();
  return db.getAll('offline_incidents');
}

/**
 * Count how many incidents are pending synchronization
 */
export async function getPendingSyncCount(): Promise<number> {
  try {
    const db = await getDB();
    const all = await db.getAll('offline_incidents');
    return all.filter(
      item => item.syncMetadata.syncStatus === 'PENDING' || item.syncMetadata.syncStatus === 'FAILED'
    ).length;
  } catch (err) {
    console.warn('Error fetching pending sync count:', err);
    return 0;
  }
}

/**
 * Synchronize all pending offline incidents to server/store
 * Prevents concurrent runs using isSyncing lock
 */
export async function syncOfflineQueue(): Promise<{
  syncedCount: number;
  failedCount: number;
  syncedCases: CaseRecord[];
}> {
  if (isSyncing) {
    return { syncedCount: 0, failedCount: 0, syncedCases: [] };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0, syncedCases: [] };
  }

  isSyncing = true;
  let syncedCount = 0;
  let failedCount = 0;
  const syncedCases: CaseRecord[] = [];

  try {
    const db = await getDB();
    const incidents = await db.getAll('offline_incidents');
    const pendingIncidents = incidents.filter(
      i => i.syncMetadata.syncStatus === 'PENDING' || i.syncMetadata.syncStatus === 'FAILED'
    );

    for (const inc of pendingIncidents) {
      try {
        // Mark as SYNCING
        inc.syncMetadata.syncStatus = 'SYNCING';
        await db.put('offline_incidents', inc);

        // 1. Create remote/local case record
        const { caseId, record } = await createCase({
          reportedByUserId: inc.reportedByUserId,
          reporterRole: inc.reporterRole,
          primarySpecies: inc.primarySpecies,
          totalAnimalsInHerd: inc.totalAnimalsInHerd,
          affectedAnimalCount: inc.affectedAnimalCount,
          deadAnimalCount: inc.deadAnimalCount,
          symptomIds: inc.symptomIds,
          onsetDate: inc.onsetDate,
          durationDays: inc.durationDays,
          additionalNotes: inc.additionalNotes,
          latitude: inc.location.latitude,
          longitude: inc.location.longitude,
          village: inc.location.village,
          block: inc.location.block,
          district: inc.location.district,
          state: inc.location.state,
          isVaccinated: inc.isVaccinated,
          vaccineNames: inc.vaccineNames,
        });

        // 2. Attach all multimodal evidence
        for (const ev of inc.evidences) {
          await addEvidence({
            caseId,
            type: ev.type,
            source: ev.source,
            uri: ev.uri,
            transcript: ev.transcript,
            metadata: ev.metadata,
          });
        }

        // 3. Mark as SYNCED in IndexedDB
        inc.syncMetadata = markSynced(inc.syncMetadata, caseId);
        await db.put('offline_incidents', inc);

        syncedCases.push(record);
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync offline incident ${inc.localId}:`, error);
        inc.syncMetadata = markSyncFailed(inc.syncMetadata);
        await db.put('offline_incidents', inc);
        failedCount++;
      }
    }
  } finally {
    isSyncing = false;
    await notifyListeners();
  }

  return { syncedCount, failedCount, syncedCases };
}

/**
 * Remove a specific offline incident from IndexedDB
 */
export async function deleteOfflineIncident(localId: string): Promise<void> {
  const db = await getDB();
  await db.delete('offline_incidents', localId);
  await notifyListeners();
}

/**
 * Clear all synced incidents to free up IndexedDB space
 */
export async function clearSyncedIncidents(): Promise<void> {
  const db = await getDB();
  const all = await db.getAll('offline_incidents');
  for (const item of all) {
    if (item.syncMetadata.syncStatus === 'SYNCED') {
      await db.delete('offline_incidents', item.localId);
    }
  }
  await notifyListeners();
}
