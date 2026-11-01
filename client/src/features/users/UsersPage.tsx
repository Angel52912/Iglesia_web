import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { ROLES, ROLE_LABELS, type Role } from '../../auth/roles';
import { useAuth } from '../../auth/useAuth';
import { createUser, listUsers, updateUser, type UserProfile } from './api';

type LoadState = 'loading' | 'ready' | 'error';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

export function UsersPage(): React.JSX.Element {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [actionError, setActionError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('secretary');
  const [creating, setCreating] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback((): void => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listUsers()
      .then((list) => {
        if (cancelled) return;
        setUsers(list);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setActionError(errorText(error));
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function handleCreate(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setActionError(null);
    setCreating(true);
    try {
      await createUser({ fullName, email, password, role });
      setFullName('');
      setEmail('');
      setPassword('');
      reload();
    } catch (error) {
      setActionError(errorText(error));
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(
    id: string,
    changes: { role?: Role; active?: boolean },
  ): Promise<void> {
    setActionError(null);
    try {
      await updateUser(id, changes);
      reload();
    } catch (error) {
      setActionError(errorText(error));
    }
  }

  return (
    <main className="page">
      <p>
        <Link to="/">← Inicio</Link>
      </p>
      <h1>Usuarios</h1>

      {actionError && (
        <p role="alert" className="error">
          {actionError}
        </p>
      )}

      <form
        className="form"
        onSubmit={(event) => {
          void handleCreate(event);
        }}
      >
        <h2>Nuevo usuario</h2>
        <label>
          Nombre completo
          <input
            required
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
            }}
          />
        </label>
        <label>
          Correo electrónico
          <input
            type="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
        </label>
        <label>
          Contraseña inicial (mínimo 8 caracteres)
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
        </label>
        <label>
          Rol
          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value as Role);
            }}
          >
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={creating}>
          {creating ? 'Creando…' : 'Crear usuario'}
        </button>
      </form>

      {loadState === 'loading' && <p className="status">Cargando…</p>}
      {loadState === 'ready' && (
        <ul className="cards">
          {users.map((item) => {
            const isSelf = item.id === currentUser?.id;
            return (
              <li key={item.id} className={item.active ? 'card' : 'card card--inactive'}>
                <strong>{item.fullName}</strong>
                <span>{item.email}</span>
                <label>
                  Rol
                  <select
                    value={item.role}
                    disabled={isSelf}
                    onChange={(event) => {
                      void handleUpdate(item.id, { role: event.target.value as Role });
                    }}
                  >
                    {ROLES.map((value) => (
                      <option key={value} value={value}>
                        {ROLE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={isSelf}
                  onClick={() => {
                    void handleUpdate(item.id, { active: !item.active });
                  }}
                >
                  {item.active ? 'Desactivar' : 'Reactivar'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
