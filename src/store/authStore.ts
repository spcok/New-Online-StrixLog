// ============================================================================
// File: src/store/authStore.ts
// ============================================================================
import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isInitialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  // Bind directly to Supabase lifecycle events to prevent token desync
  supabase.auth.onAuthStateChange((_event, session) => {
    set({ 
      session, 
      user: session?.user || null,
      isInitialized: true 
    });
  });

  return {
    session: null,
    user: null,
    isInitialized: false,

    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      set({ session: data.session, user: data.user });
    },

    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ session: null, user: null });
    },
  };
});