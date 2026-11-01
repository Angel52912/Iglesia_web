import { Link } from 'react-router-dom';
import { ROLE_LABELS, type Role } from '../auth/roles';
import { useAuth } from '../auth/useAuth';

const MEMBER_ROLES: readonly Role[] = ['admin', 'pastor', 'secretary'];

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
        {user.role === 'admin' && <Link to="/usuarios">Usuarios</Link>}
      </nav>
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
