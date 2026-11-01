import { useState, type SyntheticEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

function originPath(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    if (typeof state.from === 'string' && state.from.startsWith('/')) return state.from;
  }
  return '/';
}

export function LoginPage(): React.JSX.Element {
  const { status, message, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to={originPath(location.state)} replace />;
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  }

  const visibleError = error ?? message;

  return (
    <main className="page page--narrow">
      <h1>Iniciar sesión</h1>
      <form
        className="form"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <label>
          Correo electrónico
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
        </label>
        {visibleError && (
          <p role="alert" className="error">
            {visibleError}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
      <p>
        <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
      </p>
    </main>
  );
}
