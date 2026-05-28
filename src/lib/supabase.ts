import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[StrixLog-Fatal] Supabase configuration missing. Check your .env file to ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are defined.'
  );
}

// Instantiate the single source of truth connection
// Note: In an online-first setup, Supabase handles real-time via websockets 
// if subscribed, but our primary use is standard async REST calls for hydration.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'strixlog-cleanroom-v1',
    },
  },
});