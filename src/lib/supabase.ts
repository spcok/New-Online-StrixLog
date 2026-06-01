// ============================================================================
// File: src/lib/supabase.ts
// ============================================================================
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

// 1. Core Client Export
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Storage URL Helper Export
export function getDynamicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  
  // If the path is already a full remote URL, return it directly
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Generate the public URL from the 'media' storage bucket
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}