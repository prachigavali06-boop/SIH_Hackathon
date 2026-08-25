// ============================================================
// LIVESTOCK SENTINEL — Supabase Client Setup
// Member 1 — Backend & Supabase Integration Foundation
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
