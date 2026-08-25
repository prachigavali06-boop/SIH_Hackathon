// ============================================================
// LIVESTOCK SENTINEL — Auth Store (Zustand)
// Mock authentication — no real backend for hackathon demo
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';
import { DEMO_USERS, DEMO_CREDENTIALS } from '../data/seed';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  loginError: string | null;

  login: (email: string, password: string) => boolean;
  logout: () => void;
  switchRole: (role: UserRole) => void;   // Demo convenience
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,
      loginError: null,

      login: (email: string, password: string) => {
        const cred = DEMO_CREDENTIALS[email.toLowerCase()];
        if (!cred || cred.password !== password) {
          set({ loginError: 'Invalid email or password. Use demo credentials.' });
          return false;
        }
        const user = DEMO_USERS.find(u => u.id === cred.userId) ?? null;
        set({ currentUser: user, isAuthenticated: !!user, loginError: null });
        return !!user;
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false, loginError: null });
      },

      switchRole: (role: UserRole) => {
        const user = DEMO_USERS.find(u => u.role === role) ?? null;
        set({ currentUser: user, isAuthenticated: !!user });
      },
    }),
    {
      name: 'sentinel-auth',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
