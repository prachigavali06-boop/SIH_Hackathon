// ============================================================
// LIVESTOCK SENTINEL — Offline Storage & Sync Queue Service
// Combined: Farmer & Field Reporting (IndexedDB via idb) +
// Field Worker & Veterinary Offline Operation Queue
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
// Public Offline Queue API: Incident Reporting
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

// ----------------------------------------------------------------
// Public Offline Queue API: Field Actions & Veterinary Operation
// ----------------------------------------------------------------

export interface QueuedOfflineItem {
  id: string;
  type: 'field_visit' | 'sample_collection' | 'vaccination_update' | 'treatment_record' | 'priority_escalation';
  caseId: string;
  payload: any;
  createdAt: string;
  synced: boolean;
}

const FIELD_QUEUE_DB_NAME = 'LivestockSentinelOfflineDB';
const FIELD_QUEUE_DB_VERSION = 1;
const FIELD_QUEUE_STORE_NAME = 'field_queue';

// Open IndexedDB connection for field worker actions queue
function openFieldQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(FIELD_QUEUE_DB_NAME, FIELD_QUEUE_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(FIELD_QUEUE_STORE_NAME)) {
        const store = db.createObjectStore(FIELD_QUEUE_STORE_NAME, { keyPath: 'id' });
        store.createIndex('caseId', 'caseId', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save an offline field action into IndexedDB queue
 */
export async function enqueueOfflineAction(
  type: QueuedOfflineItem['type'],
  caseId: string,
  payload: any
): Promise<QueuedOfflineItem> {
  const item: QueuedOfflineItem = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    caseId,
    payload,
    createdAt: new Date().toISOString(),
    synced: false,
  };

  try {
    const db = await openFieldQueueDB();
    const tx = db.transaction(FIELD_QUEUE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(FIELD_QUEUE_STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const req = store.add(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB write failed, falling back to localStorage queue:', err);
    if (typeof localStorage !== 'undefined') {
      const existingStr = localStorage.getItem('sentinel_offline_queue') || '[]';
      const existing: QueuedOfflineItem[] = JSON.parse(existingStr);
      existing.push(item);
      localStorage.setItem('sentinel_offline_queue', JSON.stringify(existing));
    }
  }

  return item;
}

/**
 * Get all unsynced field action items from IndexedDB / localStorage
 */
export async function getUnsyncedOfflineItems(): Promise<QueuedOfflineItem[]> {
  try {
    const db = await openFieldQueueDB();
    const tx = db.transaction(FIELD_QUEUE_STORE_NAME, 'readonly');
    const store = tx.objectStore(FIELD_QUEUE_STORE_NAME);
    const items: QueuedOfflineItem[] = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const unsyncedDb = items.filter((i) => !i.synced);

    // Merge fallback localStorage queue
    if (typeof localStorage !== 'undefined') {
      const localStorageStr = localStorage.getItem('sentinel_offline_queue') || '[]';
      const lsItems: QueuedOfflineItem[] = JSON.parse(localStorageStr);
      const lsUnsynced = lsItems.filter((i) => !i.synced);

      const merged = [...unsyncedDb];
      for (const lsItem of lsUnsynced) {
        if (!merged.some((m) => m.id === lsItem.id)) {
          merged.push(lsItem);
        }
      }
      return merged;
    }
    return unsyncedDb;
  } catch (err) {
    console.warn('Error reading unsynced items from IndexedDB:', err);
    if (typeof localStorage !== 'undefined') {
      const localStorageStr = localStorage.getItem('sentinel_offline_queue') || '[]';
      const lsItems: QueuedOfflineItem[] = JSON.parse(localStorageStr);
      return lsItems.filter((i) => !i.synced);
    }
    return [];
  }
}

/**
 * Remove or mark synced field action item as completed
 */
export async function markItemSynced(id: string): Promise<void> {
  try {
    const db = await openFieldQueueDB();
    const tx = db.transaction(FIELD_QUEUE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(FIELD_QUEUE_STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error deleting synced item from IndexedDB:', err);
  }

  if (typeof localStorage !== 'undefined') {
    const localStorageStr = localStorage.getItem('sentinel_offline_queue') || '[]';
    const lsItems: QueuedOfflineItem[] = JSON.parse(localStorageStr);
    const updated = lsItems.filter((i) => i.id !== id);
    localStorage.setItem('sentinel_offline_queue', JSON.stringify(updated));
  }
}

/**
 * Clear all items from field action queue
 */
export async function clearOfflineQueue(): Promise<void> {
  try {
    const db = await openFieldQueueDB();
    const tx = db.transaction(FIELD_QUEUE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(FIELD_QUEUE_STORE_NAME);
    store.clear();
  } catch (err) {
    console.warn('Error clearing IndexedDB:', err);
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('sentinel_offline_queue');
  }
}

