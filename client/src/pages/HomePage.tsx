import { Link } from 'react-router-dom';
import { ROLE_LABELS } from '../auth/roles';
import { useAuth } from '../auth/useAuth';

export function HomePage(): React.JSX.Element {
  const { user, signOut } = useAuth();
  if (!user) return <></>;

  return (
    <main className="page">
      <h1>Gestión de Iglesia</h1>
      <p>
        Hola, <strong>{user.fullName}</strong> ({ROLE_LABELS[user.role]})
      </p>
      <nav className="nav">{user.role === 'admin' && <Link to="/usuarios">Usuarios</Link>}</nav>
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
