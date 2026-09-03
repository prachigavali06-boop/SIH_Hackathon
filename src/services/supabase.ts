// ============================================================
// LIVESTOCK SENTINEL — Supabase Client Setup & Demo User Seeding
// Member 1 — Backend & Supabase Integration Foundation
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DEMO_USERS } from '../data/seed';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL !== 'https://your-project.supabase.co' &&
    !SUPABASE_URL.includes('your-project')
  );
};

// Singleton Supabase Client instance (fallback to empty dummy client if unconfigured)
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder'
);

let usersSeeded = false;

/**
 * Ensures demo users exist in the Supabase 'users' table so foreign key
 * constraints (reported_by_user_id, assigned_vet_user_id, etc.) succeed.
 */
export async function ensureDemoUsersSeeded(): Promise<void> {
  if (!isSupabaseConfigured() || usersSeeded) return;
  try {
    const usersPayload = DEMO_USERS.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      district: u.district,
      block: u.block || null,
      village: u.village || null,
      phone: u.phone || null,
      avatar_initials: u.avatarInitials || null,
    }));
    await supabase.from('users').upsert(usersPayload, { onConflict: 'id' });
    usersSeeded = true;
  } catch (err) {
    console.warn('Could not seed demo users:', err);
  }
}
