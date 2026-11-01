import { createContext } from 'react';
import type { CurrentUser } from './roles';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  // Motivo por el que se cerró o rechazó la sesión (por ejemplo, cuenta desactivada).
  message: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
