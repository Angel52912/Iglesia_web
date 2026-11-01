import { useState, type SyntheticEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSupabase } from '../lib/supabaseClient';

const MIN_LENGTH = 8;

export function ResetPasswordPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${String(MIN_LENGTH)} caracteres`);
      return;
    }
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setSubmitting(true);
    try {
      // Requiere la sesión de recuperación que Supabase crea al abrir el enlace del correo.
      const { error: updateError } = await getSupabase().auth.updateUser({ password });
      if (updateError) {
        setError('No se pudo cambiar la contraseña. El enlace pudo haber expirado.');
        return;
      }
      await navigate('/', { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page page--narrow">
      <h1>Nueva contraseña</h1>
      <form
        className="form"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <label>
          Nueva contraseña
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
        </label>
        <label>
          Repite la contraseña
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={(event) => {
              setConfirmation(event.target.value);
            }}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
      <p>
        <Link to="/login">Volver a iniciar sesión</Link>
      </p>
    </main>
  );
}
