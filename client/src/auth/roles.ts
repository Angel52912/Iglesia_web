export const ROLES = ['admin', 'pastor', 'secretary', 'treasurer', 'coordinator'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  pastor: 'Pastor',
  secretary: 'Secretario',
  treasurer: 'Tesorero',
  coordinator: 'Coordinador',
};

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}
