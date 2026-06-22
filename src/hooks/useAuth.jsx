import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
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

  /**
   * Link Microsoft identity to the current user for OneNote access.
   * Uses linkIdentity (not signInWithOAuth) so the Microsoft account
   * is added to the EXISTING user, even if the emails differ
   * (e.g., Gmail for QuizifAI + Hotmail for OneNote).
   */
  const connectMicrosoft = async (redirectPath = '/generate') => {
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'azure',
      options: {
        scopes: 'openid email profile Notes.Read',
        redirectTo: window.location.origin + redirectPath,
      },
    });
    if (error) throw error;
    return data;
  };

  // Extract Microsoft Graph provider_token from the session (if available)
  const providerToken = session?.provider_token || null;

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
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
