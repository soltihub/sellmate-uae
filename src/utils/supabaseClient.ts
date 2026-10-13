import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials safely from Vite import.meta.env or Node process.env
const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
};

const SUPABASE_URL =
  getEnvVar('VITE_SUPABASE_URL') ||
  'https://krarnhruludwscihdbbr.supabase.co';

const SUPABASE_ANON_KEY =
  getEnvVar('VITE_SUPABASE_ANON_KEY') ||
  '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Shared Supabase Client instance for SellMate UAE
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: typeof window !== 'undefined',
  },
});
