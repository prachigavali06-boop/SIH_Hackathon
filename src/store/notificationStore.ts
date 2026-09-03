// ============================================================
// LIVESTOCK SENTINEL — Notification Store (Zustand with Persist)
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Alert } from '../types';
import { SYNTHETIC_NOTIFICATIONS } from '../data/seed';

interface NotificationState {
  notifications: Alert[];
  unreadCount: number;

  addNotification: (n: Omit<Alert, 'id' | 'timestamp' | 'createdAt' | 'isRead'> & { id?: string; createdAt?: string; isRead?: boolean }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: SYNTHETIC_NOTIFICATIONS,
      unreadCount: SYNTHETIC_NOTIFICATIONS.filter(n => !n.isRead).length,

      addNotification: (n) => {
        const now = new Date().toISOString();
        const id = n.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

        // Duplicate prevention by id
        const existing = get().notifications.find(item => item.id === id);
        if (existing) return;

        const isRead = n.isRead ?? false;
        const newNotif: Alert = {
          ...n,
          id,
          createdAt: n.createdAt || now,
          timestamp: n.createdAt || now,
          isRead,
        };

        set(state => ({
          notifications: [newNotif, ...state.notifications],
          unreadCount: isRead ? state.unreadCount : state.unreadCount + 1,
        }));
      },

      markRead: (id) => {
        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, state.notifications.filter(n => n.id !== id ? !n.isRead : false).length),
        }));
      },

      markAllRead: () => {
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, isRead: true })),
          unreadCount: 0,
        }));
      },

      clearNotification: (id) => {
        const remaining = get().notifications.filter(n => n.id !== id);
        set({
          notifications: remaining,
          unreadCount: remaining.filter(n => !n.isRead).length,
        });
      },
    }),
    {
      name: 'sentinel-notifications',
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }),
    }
  )
);

