import { useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabaseClient';

export function ForgotPasswordPage(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await getSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/restablecer`,
      });
      // Mismo mensaje exista o no el correo: no revela qué cuentas están registradas.
      setSent(true);
    } catch {
      setError('No se pudo enviar el correo. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page page--narrow">
      <h1>Recuperar contraseña</h1>
      {sent ? (
        <p role="status">
          Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.
        </p>
      ) : (
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
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>
      )}
      <p>
        <Link to="/login">Volver a iniciar sesión</Link>
      </p>
    </main>
  );
}
