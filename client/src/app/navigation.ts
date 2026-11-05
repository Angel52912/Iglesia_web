import type { Role } from '../auth/roles';
import type { IconName } from '../components/Icon';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  // Sin roles, lo ve cualquier usuario con sesión. Es solo ayuda visual: el backend autoriza.
  roles?: readonly Role[];
}

const MEMBER_ROLES: readonly Role[] = ['admin', 'pastor', 'secretary'];
const EVENT_ROLES: readonly Role[] = ['admin', 'pastor', 'secretary', 'treasurer'];
const DONATION_ROLES: readonly Role[] = ['admin', 'pastor', 'treasurer'];
const REPORT_ROLES: readonly Role[] = ['admin', 'pastor', 'secretary', 'treasurer'];
const ANNOUNCEMENT_ROLES: readonly Role[] = ['admin', 'pastor', 'secretary', 'coordinator'];

// Mismo orden y mismos roles que tenía el menú del inicio.
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/miembros', label: 'Miembros', icon: 'members', roles: MEMBER_ROLES },
  { to: '/eventos', label: 'Eventos', icon: 'calendar', roles: EVENT_ROLES },
  { to: '/asistencia', label: 'Asistencia', icon: 'attendance', roles: MEMBER_ROLES },
  { to: '/ministerios', label: 'Ministerios', icon: 'ministries', roles: MEMBER_ROLES },
  { to: '/donaciones', label: 'Donaciones', icon: 'donations', roles: DONATION_ROLES },
  { to: '/comunicados', label: 'Comunicados', icon: 'announcements', roles: ANNOUNCEMENT_ROLES },
  { to: '/reportes', label: 'Reportes', icon: 'reports', roles: REPORT_ROLES },
  { to: '/usuarios', label: 'Usuarios', icon: 'users', roles: ['admin'] },
  { to: '/configuracion', label: 'Configuración', icon: 'settings', roles: ['admin'] },
];

export function navItemsFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
