import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  language: "zh" | "en";
  // Actions
  setSession: (session: Session | null) => void;
  setLanguage: (lang: "zh" | "en") => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<() => void>; // returns unsubscribe fn
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  language: "zh",

  setSession: (session) =>
    set({ session, user: session?.user ?? null, loading: false }),

  setLanguage: (language) => set({ language }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  initialize: async () => {
    // Load current session on startup
    const {
      data: { session },
    } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, loading: false });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false });
    });

    return () => subscription.unsubscribe();
  },
}));
