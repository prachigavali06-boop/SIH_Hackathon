// ============================================================
// OfflineBanner — Global connectivity & sync queue notification
// Member 2 — Offline-First Support
// ============================================================

import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import {
  subscribeToSyncEvents,
  syncOfflineQueue,
  getPendingSyncCount,
} from '../../services/offlineQueue';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSyncEvents((count, online) => {
      setPendingCount(count);
      setIsOnline(online);
      if (!online) {
        setDismissed(false); // Re-open on offline transition
      }
    });

    // Check initial count
    getPendingSyncCount().then(setPendingCount);

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const { syncedCount, failedCount } = await syncOfflineQueue();
      if (syncedCount > 0) {
        setSyncSuccessMsg(
          `Successfully synchronized ${syncedCount} offline incident report${
            syncedCount > 1 ? 's' : ''
          }!`
        );
        setTimeout(() => setSyncSuccessMsg(null), 5000);
      }
      if (failedCount > 0) {
        alert(`${failedCount} report(s) failed to sync. They remain in your offline queue.`);
      }
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // If online, no pending items, and no success msg, do not show
  if (isOnline && pendingCount === 0 && !syncSuccessMsg) {
    return null;
  }

  if (dismissed && isOnline) {
    return null;
  }

  return (
    <div className="w-full transition-all duration-300">
      {/* Offline Mode Alert */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2.5 flex items-center justify-between shadow-md text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 font-600">
            <WifiOff size={18} className="flex-shrink-0 animate-pulse text-amber-200" />
            <span>
              <strong>Offline Mode Active:</strong> No internet detected. Field reports and photos will be safely saved locally and synced when connection returns.
            </span>
          </div>
          {pendingCount > 0 && (
            <span className="bg-amber-800/80 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold flex-shrink-0 ml-2">
              {pendingCount} queued
            </span>
          )}
        </div>
      )}

      {/* Online with Pending Syncs Banner */}
      {isOnline && pendingCount > 0 && (
        <div className="bg-emerald-700 text-white px-4 py-2 flex items-center justify-between shadow-md text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 font-600">
            <AlertTriangle size={18} className="flex-shrink-0 text-emerald-200" />
            <span>
              Back Online! You have <strong>{pendingCount}</strong> offline report{pendingCount > 1 ? 's' : ''} stored locally.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="btn btn-sm bg-white text-emerald-800 hover:bg-emerald-50 font-700 shadow-xs flex items-center gap-1.5 py-1 px-3"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing…' : 'Sync Now'}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-emerald-200 hover:text-white p-1"
              aria-label="Dismiss banner"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Sync Success Toast/Banner */}
      {syncSuccessMsg && (
        <div className="bg-green-600 text-white px-4 py-2 flex items-center justify-between shadow-md text-xs sm:text-sm animate-fade-in">
          <div className="flex items-center gap-2 font-600">
            <CheckCircle2 size={16} className="text-green-200" />
            <span>{syncSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSyncSuccessMsg(null)}
            className="text-green-200 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
