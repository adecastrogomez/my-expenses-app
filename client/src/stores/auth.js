import { defineStore } from 'pinia';
import { supabase } from '../supabase.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({ session: null, ready: false }),

  actions: {
    async init() {
      const { data } = await supabase.auth.getSession();
      this.session = data.session;
      this.ready = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        this.session = session;
      });
    },

    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },

    /** Devuelve true si requiere confirmar el email antes de entrar. */
    async signUp(email, password, name) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (error) throw new Error(error.message);
      return !data.session;
    },

    signOut: () => supabase.auth.signOut(),
  },
});
