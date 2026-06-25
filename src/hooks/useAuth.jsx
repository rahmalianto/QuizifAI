import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const PROVIDER_TOKEN_KEY = 'quizifai_provider_token';
const PROVIDER_REFRESH_TOKEN_KEY = 'quizifai_provider_refresh_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [providerToken, setProviderToken] = useState(
    () => localStorage.getItem(PROVIDER_TOKEN_KEY) || null
  );

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.debug('[Auth] getSession:', {
        hasSession: !!session,
        hasProviderToken: !!session?.provider_token,
        hasProviderRefreshToken: !!session?.provider_refresh_token,
      });

      setSession(session);
      setUser(session?.user ?? null);

      // On initial load, if the session carries a fresh provider_token
      // (e.g. right after OAuth redirect), persist it.
      if (session?.provider_token) {
        setProviderToken(session.provider_token);
        localStorage.setItem(PROVIDER_TOKEN_KEY, session.provider_token);
      }
      if (session?.provider_refresh_token) {
        localStorage.setItem(PROVIDER_REFRESH_TOKEN_KEY, session.provider_refresh_token);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.debug('[Auth] onAuthStateChange:', {
          event,
          hasSession: !!session,
          hasProviderToken: !!session?.provider_token,
          hasProviderRefreshToken: !!session?.provider_refresh_token,
        });

        setSession(session);
        setUser(session?.user ?? null);

        // Capture provider_token whenever Supabase hands it to us
        if (session?.provider_token) {
          setProviderToken(session.provider_token);
          localStorage.setItem(PROVIDER_TOKEN_KEY, session.provider_token);
        }
        if (session?.provider_refresh_token) {
          localStorage.setItem(PROVIDER_REFRESH_TOKEN_KEY, session.provider_refresh_token);
        }

        // Clear persisted tokens on sign-out
        if (event === 'SIGNED_OUT') {
          setProviderToken(null);
          localStorage.removeItem(PROVIDER_TOKEN_KEY);
          localStorage.removeItem(PROVIDER_REFRESH_TOKEN_KEY);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password',
    });
    if (error) throw error;
    return data;
  };

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return data;
  };

  /**
   * Connect Microsoft account for OneNote access.
   * Uses signInWithOAuth which reliably returns provider_token
   * in the session after redirect.
   */
  const connectMicrosoft = async (redirectPath = '/generate') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'openid email profile Notes.Read offline_access',
        redirectTo: window.location.origin + redirectPath,
      },
    });
    if (error) throw error;
    return data;
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    connectMicrosoft,
    providerToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

