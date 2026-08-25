// ============================================================
// AlertsPage — Module 9: Notifications & Emergency Broadcasts
// Targeted role-based alerts & critical containment warnings
// ============================================================

import { useState } from 'react';
import { Bell, CheckCheck, Trash2, Siren, Filter, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { AlertBanner } from '../components/ui/AlertBanner';

export function AlertsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { notifications, unreadCount, markRead, markAllRead, clearNotification, addNotification } = useNotificationStore();

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const filtered = notifications.filter(n => {
    if (severityFilter !== 'all' && n.severity !== severityFilter) return false;
    if (n.targetRoles && currentUser && !n.targetRoles.includes(currentUser.role)) return false;
    return true;
  });

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    addNotification({
      severity: 'critical',
      title: 'EMERGENCY BROADCAST — Government Veterinary Officer',
      message: broadcastMessage,
      actionLabel: 'View Guidance',
      actionPath: '/dashboard',
    });

    setBroadcastMessage('');
    setShowBroadcastModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title text-xl">
            <Bell size={22} className="text-red-600" />
            Alerts & Notification Center
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Role-Targeted Alerts · Emergency Outbreak Broadcasts · {unreadCount} Unread
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

      {/* Broadcast Modal for Gov Officers */}
      {showBroadcastModal && (
        <div className="card p-5 border-2 border-red-500 bg-red-50/50 space-y-3">
          <div className="flex items-center gap-2 text-red-900 font-700 text-sm">
            <Siren size={18} /> Issue Emergency District Alert Broadcast
          </div>
          <form onSubmit={handleSendBroadcast} className="space-y-3">
            <textarea
              value={broadcastMessage}
              onChange={e => setBroadcastMessage(e.target.value)}
              placeholder="Enter critical alert message for farmers and para-vets in affected blocks…"
              className="form-textarea border-red-300"
              rows={3}
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowBroadcastModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-danger btn-sm">
                Dispatch District Alert
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Severity Filter Pills */}
      <div className="flex items-center gap-2">
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

                  <div className="flex items-center gap-4 pl-6 pt-2 text-[11px] text-gray-400">
                    <span>{format(new Date(n.timestamp), 'dd MMM yyyy, HH:mm')}</span>
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

                <div className="flex items-center gap-1">
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
