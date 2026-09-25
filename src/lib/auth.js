import { supabase, isSupabaseConfigured } from './supabase.js';

/**
 * Authentication module — Supabase Auth for the blog owner with Demo Mode fallback
 */

const DEMO_SESSION_KEY = 'meroros_demo_creator_session';

export async function signIn(email, password) {
  if (!isSupabaseConfigured) {
    // If not configured, allow creator demo login
    signInDemo();
    return { user: { email } };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export function signInDemo() {
  localStorage.setItem(DEMO_SESSION_KEY, 'true');
}

export async function signOut() {
  localStorage.removeItem(DEMO_SESSION_KEY);
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return session;
    } catch (e) {
      console.warn('Error fetching Supabase session:', e);
    }
  }

  if (localStorage.getItem(DEMO_SESSION_KEY) === 'true') {
    return {
      user: {
        email: 'creadora@merorosdays.com',
        role: 'authenticated',
      },
    };
  }

  return null;
}

export async function getUser() {
  const session = await getSession();
  return session ? session.user : null;
}

export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
}
