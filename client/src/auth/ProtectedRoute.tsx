import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from './roles';
import { useAuth } from './useAuth';

interface ProtectedRouteProps {
  // Sin roles, basta con tener sesión. Es solo ayuda visual: el backend es quien autoriza.
  roles?: readonly Role[];
  children: ReactNode;
}

export function ProtectedRoute({ roles, children }: ProtectedRouteProps): React.JSX.Element {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <p className="status">Cargando…</p>;
  }
  if (status === 'anonymous' || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <main className="page">
        <h1>Sin acceso</h1>
        <p role="alert">No tienes permiso para ver esta página.</p>
      </main>
    );
  }
  return <>{children}</>;
}
