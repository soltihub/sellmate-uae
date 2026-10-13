import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

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

export const SUPABASE_URL =
  getEnvVar('VITE_SUPABASE_URL') ||
  'https://krarnhruludwscihdbbr.supabase.co';

export const SUPABASE_ANON_KEY =
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

/**
 * Gets currently authenticated Supabase user or null
 */
export async function getAuthUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (err) {
    console.warn('[Supabase Auth] getUser error:', err);
    return null;
  }
}

/**
 * Gets current session or null
 */
export async function getAuthSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (err) {
    console.warn('[Supabase Auth] getSession error:', err);
    return null;
  }
}

/**
 * Signs in with email and password
 */
export async function signInMerchant(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

/**
 * Signs up a new merchant account
 */
export async function signUpMerchant(email: string, password: string, businessName: string) {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        business_name: businessName,
      },
    },
  });
}

/**
 * Signs out current merchant
 */
export async function signOutMerchant() {
  return await supabase.auth.signOut();
}
