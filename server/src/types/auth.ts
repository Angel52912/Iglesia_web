export const ROLES = ['admin', 'pastor', 'secretary', 'treasurer', 'coordinator'] as const;

export type AppRole = (typeof ROLES)[number];

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
}

export type AuthResult =
  { status: 'ok'; user: AuthenticatedUser } | { status: 'invalid' } | { status: 'inactive' };

export interface Authenticator {
  // El rol y el estado activo se leen de public.profiles, nunca de los claims del token.
  authenticate(token: string): Promise<AuthResult>;
}
