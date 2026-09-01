// ============================================================
// AlertsPage — Module 9: Notifications & Emergency Broadcasts
// Targeted role-based alerts · Persistent alert loading ·
// Broadcast fires createAlert() for proper persistence
// Member 6 — Laboratory, Alerts & Vaccination Analytics
// ============================================================

import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, Siren, Filter, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { AlertBanner } from '../components/ui/AlertBanner';
import { retrieveAlerts } from '../services/api';
import { createAlert } from '../services/platform';
import type { UserRole } from '../types';

// Roles targeted by a district-wide broadcast (excludes lab_tech / admin from primary alerting)
const BROADCAST_TARGET_ROLES: UserRole[] = ['farmer', 'paravet', 'veterinarian', 'gov_officer'];

export function AlertsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    clearNotification,
    addNotification,
  } = useNotificationStore();

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'warning' | 'critical'>('critical');
  const [broadcastTarget, setBroadcastTarget] = useState<'district' | 'all'>('district');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  // ----------------------------------------------------------------
  // Load persistent alerts from the service store on mount
  // and merge any new ones into the Zustand store
  // ----------------------------------------------------------------
  useEffect(() => {
    let mounted = true;
    retrieveAlerts()
      .then(persistedAlerts => {
        if (!mounted) return;
        // Add any persisted alerts not already present in Zustand
        const existingIds = new Set(notifications.map(n => n.id));
        persistedAlerts.forEach(a => {
          if (!existingIds.has(a.id)) {
            addNotification({
              severity: a.severity,
              title: a.title,
              message: a.message,
              caseId: a.caseId,
              targetRoles: a.targetRoles,
              actionPath: a.actionPath,
              actionLabel: a.actionLabel,
              createdAt: a.createdAt,
            });
          }
        });
      })
      .catch(() => { /* silent fallback */ })
      .finally(() => { if (mounted) setLoadingAlerts(false); });
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------
  // Send district broadcast
  // ----------------------------------------------------------------
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    const title = `EMERGENCY BROADCAST — ${currentUser?.name ?? 'Government Veterinary Officer'}`;
    const district = broadcastTarget === 'district' ? (currentUser?.district ?? undefined) : undefined;

    setIsSendingBroadcast(true);
    try {
      // Persist via platform service (fires case event + stores in ALERTS_EXTENDED_STORE)
      await createAlert({
        alertType: 'HIGH_RISK_CASE',
        severity: broadcastSeverity,
        title,
        message: broadcastMessage,
        targetRoles: BROADCAST_TARGET_ROLES,
        targetDistrict: district,
        actionPath: '/dashboard',
        actionLabel: 'View Dashboard',
      });

      // Also push to local Zustand store for instant visibility
      addNotification({
        severity: broadcastSeverity,
        title,
        message: broadcastMessage,
        targetRoles: BROADCAST_TARGET_ROLES,
        actionLabel: 'View Dashboard',
        actionPath: '/dashboard',
      });
    } catch {
      // Fallback: still add locally
      addNotification({
        severity: broadcastSeverity,
        title,
        message: broadcastMessage,
        targetRoles: BROADCAST_TARGET_ROLES,
        actionLabel: 'View Dashboard',
        actionPath: '/dashboard',
      });
    } finally {
      setIsSendingBroadcast(false);
      setBroadcastMessage('');
      setShowBroadcastModal(false);
    }
  };

  // Filter notifications by severity and role
  const filtered = notifications.filter(n => {
    if (severityFilter !== 'all' && n.severity !== severityFilter) return false;
    if (n.targetRoles && currentUser && !n.targetRoles.includes(currentUser.role)) return false;
    return true;
  });

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title text-xl">
            <Bell size={22} className="text-red-600" />
            Alerts &amp; Notification Center
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Role-Targeted Alerts · Emergency Outbreak Broadcasts ·{' '}
            {unreadCount > 0 ? (
              <span className="font-700 text-red-600">{unreadCount} Unread</span>
            ) : (
              'All Read'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn btn-sm btn-secondary">
              <CheckCheck size={14} /> Mark All Read
            </button>
          )}
          {(currentUser?.role === 'gov_officer' || currentUser?.role === 'admin') && (
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="btn btn-sm btn-danger"
            >
              <Siren size={14} /> Send Broadcast
            </button>
          )}
        </div>
      </div>

      {/* Broadcast Modal — gov_officer / admin only */}
      {showBroadcastModal && (
        <div className="card p-5 border-2 border-red-500 bg-red-50/50 space-y-4">
          <div className="flex items-center gap-2 text-red-900 font-700 text-sm">
            <Siren size={18} /> Issue Emergency District Alert Broadcast
          </div>
          <form onSubmit={handleSendBroadcast} className="space-y-3">
            {/* Severity selector */}
            <div className="flex gap-3">
              {(['critical', 'warning'] as const).map(s => (
                <label
                  key={s}
                  className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-600 capitalize ${
                    broadcastSeverity === s
                      ? s === 'critical' ? 'border-red-500 bg-red-100 text-red-800' : 'border-orange-400 bg-orange-50 text-orange-800'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="broadcastSeverity"
                    value={s}
                    checked={broadcastSeverity === s}
                    onChange={() => setBroadcastSeverity(s)}
                    className="sr-only"
                  />
                  {s === 'critical' ? '🔴' : '🟠'} {s}
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-600 border-gray-200 text-gray-600">
                <input
                  type="checkbox"
                  checked={broadcastTarget === 'district'}
                  onChange={e => setBroadcastTarget(e.target.checked ? 'district' : 'all')}
                />
                District-only ({currentUser?.district})
              </label>
            </div>

            <textarea
              value={broadcastMessage}
              onChange={e => setBroadcastMessage(e.target.value)}
              placeholder="Enter critical alert message for farmers and para-vets in affected blocks…"
              className="form-textarea border-red-300"
              rows={3}
              required
            />
            <p className="text-xs text-gray-500">
              This will be sent to: {BROADCAST_TARGET_ROLES.join(', ')} in {broadcastTarget === 'district' ? `${currentUser?.district} district` : 'all districts'}.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowBroadcastModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSendingBroadcast}
                className="btn btn-danger btn-sm"
              >
                {isSendingBroadcast
                  ? <><Loader2 size={13} className="animate-spin" /> Dispatching…</>
                  : 'Dispatch District Alert'
                }
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Severity Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={15} className="text-gray-400" />
        {['all', 'critical', 'warning', 'info', 'success'].map(sev => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            className={`px-3 py-1 text-xs rounded-full capitalize font-600 ${
              severityFilter === sev
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {sev}
          </button>
        ))}
      </div>

      {/* Loading spinner */}
      {loadingAlerts && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={14} className="animate-spin" /> Loading alerts…
        </div>
      )}

      {/* Notification Cards List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-8 text-center text-gray-400 text-sm">
            No notifications match your criteria.
          </div>
        ) : (
          filtered.map(n => (
            <div
              key={n.id}
              className={`card p-4 transition-all ${
                !n.isRead ? 'bg-white border-l-4 border-l-green-600 shadow-sm' : 'bg-gray-50/60 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AlertBanner
                      severity={n.severity}
                      title={n.title}
                      compact
                      className="p-1.5 border-none bg-transparent"
                    />
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-700 pl-6">{n.message}</p>

                  <div className="flex items-center gap-4 pl-6 pt-2 text-[11px] text-gray-400 flex-wrap">
                    <span>
                      {format(
                        new Date(n.createdAt || n.timestamp || new Date().toISOString()),
                        'dd MMM yyyy, HH:mm'
                      )}
                    </span>
                    {n.targetRoles && n.targetRoles.length > 0 && (
                      <span className="text-gray-300">
                        → {n.targetRoles.join(', ')}
                      </span>
                    )}
                    {n.actionPath && (
                      <button
                        onClick={() => {
                          markRead(n.id);
                          navigate(n.actionPath!);
                        }}
                        className="text-green-700 font-600 hover:underline inline-flex items-center gap-1"
                      >
                        {n.actionLabel ?? 'View Details'} <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.isRead && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="p-1 text-gray-400 hover:text-green-600"
                      title="Mark as Read"
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => clearNotification(n.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Dismiss"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
