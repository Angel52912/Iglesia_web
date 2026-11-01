import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../src/auth/authContext';

export function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: 'anonymous',
    user: null,
    message: null,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function WithAuth({
  value,
  children,
}: {
  value: AuthContextValue;
  children: ReactNode;
}): React.JSX.Element {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
