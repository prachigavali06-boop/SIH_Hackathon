// ============================================================
// LIVESTOCK SENTINEL — Offline Queue & IndexedDB Sync Service
// Member 3 — Field Worker & Veterinary Offline Operation
// ============================================================

export interface QueuedOfflineItem {
  id: string;
  type: 'field_visit' | 'sample_collection' | 'vaccination_update' | 'treatment_record' | 'priority_escalation';
  caseId: string;
  payload: any;
  createdAt: string;
  synced: boolean;
}

const DB_NAME = 'LivestockSentinelOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'field_queue';

// Open IndexedDB connection
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
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
 * Save an offline action into IndexedDB queue
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
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const req = store.add(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB write failed, falling back to localStorage queue:', err);
    const existingStr = localStorage.getItem('sentinel_offline_queue') || '[]';
    const existing: QueuedOfflineItem[] = JSON.parse(existingStr);
    existing.push(item);
    localStorage.setItem('sentinel_offline_queue', JSON.stringify(existing));
  }

  return item;
}

/**
 * Get all unsynced items from IndexedDB
 */
export async function getUnsyncedOfflineItems(): Promise<QueuedOfflineItem[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const items: QueuedOfflineItem[] = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const unsyncedDb = items.filter((i) => !i.synced);

    // Merge fallback localStorage queue
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
  } catch (err) {
    console.warn('Error reading unsynced items from IndexedDB:', err);
    const localStorageStr = localStorage.getItem('sentinel_offline_queue') || '[]';
    const lsItems: QueuedOfflineItem[] = JSON.parse(localStorageStr);
    return lsItems.filter((i) => !i.synced);
  }
}

/**
 * Remove or mark synced item as completed
 */
export async function markItemSynced(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error deleting synced item from IndexedDB:', err);
  }

  const localStorageStr = localStorage.getItem('sentinel_offline_queue') || '[]';
  const lsItems: QueuedOfflineItem[] = JSON.parse(localStorageStr);
  const updated = lsItems.filter((i) => i.id !== id);
  localStorage.setItem('sentinel_offline_queue', JSON.stringify(updated));
}

/**
 * Clear all items from queue
 */
export async function clearOfflineQueue(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
  } catch (err) {
    console.warn('Error clearing IndexedDB:', err);
  }
  localStorage.removeItem('sentinel_offline_queue');
}
