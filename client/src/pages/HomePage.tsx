import { Link } from 'react-router-dom';
import { ROLE_LABELS, type Role } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { DashboardPanel } from '../features/dashboard/DashboardPanel';

const MEMBER_ROLES: readonly Role[] = ['admin', 'pastor', 'secretary'];
const EVENT_ROLES: readonly Role[] = ['admin', 'pastor', 'secretary', 'treasurer'];
const DONATION_ROLES: readonly Role[] = ['admin', 'pastor', 'treasurer'];
const REPORT_ROLES: readonly Role[] = ['admin', 'pastor', 'secretary', 'treasurer'];
const ANNOUNCEMENT_ROLES: readonly Role[] = ['admin', 'pastor', 'secretary', 'coordinator'];

export function HomePage(): React.JSX.Element {
  const { user, signOut } = useAuth();
  if (!user) return <></>;

  return (
    <main className="page">
      <h1>Gestión de Iglesia</h1>
      <p>
        Hola, <strong>{user.fullName}</strong> ({ROLE_LABELS[user.role]})
      </p>
      <nav className="nav">
        {MEMBER_ROLES.includes(user.role) && <Link to="/miembros">Miembros</Link>}
        {EVENT_ROLES.includes(user.role) && <Link to="/eventos">Eventos</Link>}
        {MEMBER_ROLES.includes(user.role) && <Link to="/asistencia">Asistencia</Link>}
        {MEMBER_ROLES.includes(user.role) && <Link to="/ministerios">Ministerios</Link>}
        {DONATION_ROLES.includes(user.role) && <Link to="/donaciones">Donaciones</Link>}
        {ANNOUNCEMENT_ROLES.includes(user.role) && <Link to="/comunicados">Comunicados</Link>}
        {REPORT_ROLES.includes(user.role) && <Link to="/reportes">Reportes</Link>}
        {user.role === 'admin' && <Link to="/usuarios">Usuarios</Link>}
        {user.role === 'admin' && <Link to="/configuracion">Configuración</Link>}
      </nav>
      <DashboardPanel />
      <button
        type="button"
        onClick={() => {
          void signOut();
        }}
      >
        Cerrar sesión
      </button>
    </main>
  );
}
