// ============================================================
// LIVESTOCK SENTINEL — Notification Store (Zustand)
// ============================================================

import { create } from 'zustand';
import type { AppNotification } from '../types';
import { SYNTHETIC_NOTIFICATIONS } from '../data/seed';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;

  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: SYNTHETIC_NOTIFICATIONS,
  unreadCount: SYNTHETIC_NOTIFICATIONS.filter(n => !n.isRead).length,

  addNotification: (n) => {
    const newNotif: AppNotification = {
      ...n,
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    set(state => ({
      notifications: [newNotif, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markRead: (id) => {
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  clearNotification: (id) => {
    const n = get().notifications.find(n => n.id === id);
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id),
      unreadCount: n && !n.isRead ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }));
  },
}));
