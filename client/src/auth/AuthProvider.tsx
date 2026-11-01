import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, apiRequest } from '../lib/apiClient';
import { getSupabase } from '../lib/supabaseClient';
import { AuthContext, type AuthContextValue } from './authContext';
import type { CurrentUser } from './roles';

type AuthState = Pick<AuthContextValue, 'status' | 'user' | 'message'>;

const LOADING: AuthState = { status: 'loading', user: null, message: null };

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<AuthState>(LOADING);

  // El rol y el estado activo vienen de la API (que los lee de profiles), no del token.
  const applySession = useCallback(async (token: string | null): Promise<void> => {
    if (!token) {
      setState((previous) => ({ status: 'anonymous', user: null, message: previous.message }));
      return;
    }
    try {
      const { user } = await apiRequest<{ user: CurrentUser }>('/api/auth/me', { token });
      setState({ status: 'authenticated', user, message: null });
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 403
          ? error.message
          : 'No se pudo verificar tu sesión. Inicia sesión de nuevo.';
      setState({ status: 'anonymous', user: null, message });
      void getSupabase().auth.signOut();
    }
  }, []);

  useEffect(() => {
    // Emite INITIAL_SESSION al suscribirse, así que no hace falta pedir la sesión aparte.
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      void applySession(session?.access_token ?? null);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error('Correo o contraseña incorrectos');
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await getSupabase().auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, signOut }),
    [state, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
