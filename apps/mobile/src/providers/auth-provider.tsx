import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';

export type AppRole = 'customer' | 'employee' | 'admin';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  error: string | null;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = session?.user.id;

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;

      setSession(data.session);
      setError(sessionError?.message ?? null);
      setSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setError(null);
      setSessionLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadRole = useCallback(async () => {
    if (!userId) {
      setRole(null);
      setRoleLoading(false);
      return;
    }

    setRoleLoading(true);
    setError(null);

    const { data, error: roleError } = await supabase
      .from('staff_members')
      .select('role')
      .eq('user_id', userId)
      .eq('active', true)
      .maybeSingle();

    if (roleError) {
      setRole(null);
      setError('No se pudo verificar el tipo de usuario.');
    } else {
      setRole(data?.role ?? 'customer');
    }

    setRoleLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadRole();
  }, [loadRole]);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      throw signOutError;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      role,
      loading:
        sessionLoading ||
        roleLoading ||
        Boolean(session && !role && !error),
      error,
      refreshRole: loadRole,
      signOut,
    }),
    [error, loadRole, role, roleLoading, session, sessionLoading, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }

  return context;
}
