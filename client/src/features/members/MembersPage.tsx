import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { useAuth } from '../../auth/useAuth';
import { FormPanel } from '../../components/FormPanel';
import {
  createMember,
  listMembers,
  updateMember,
  type ActiveFilter,
  type Member,
  type MemberPayload,
} from './api';

type LoadState = 'loading' | 'ready' | 'error';

const EMPTY_FORM: MemberPayload = { fullName: '', phone: '', email: '', joinedOn: '' };

const STATUS_OPTIONS: { value: ActiveFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

export function MembersPage(): React.JSX.Element {
  const { user } = useAuth();
  // El pastor solo consulta; el servidor también lo exige (403).
  const canWrite = user?.role === 'admin' || user?.role === 'secretary';

  const [members, setMembers] = useState<Member[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ActiveFilter>('active');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback((): void => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Espera breve al escribir en la búsqueda para no pedir en cada tecla.
    const timer = setTimeout(() => {
      listMembers({ search, status })
        .then((list) => {
          if (cancelled) return;
          setMembers(list);
          setLoadState('ready');
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setActionError(errorText(error));
          setLoadState('error');
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, status, reloadKey]);

  function startEdit(member: Member): void {
    setEditingId(member.id);
    setForm({
      fullName: member.fullName,
      phone: member.phone ?? '',
      email: member.email ?? '',
      joinedOn: member.joinedOn,
    });
  }

  function cancelEdit(): void {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setActionError(null);
    setSaving(true);
    try {
      if (editingId) {
        await updateMember(editingId, form);
      } else {
        await createMember(form);
      }
      cancelEdit();
      reload();
    } catch (error) {
      setActionError(errorText(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(member: Member): Promise<void> {
    setActionError(null);
    try {
      await updateMember(member.id, { active: !member.active });
      reload();
    } catch (error) {
      setActionError(errorText(error));
    }
  }

  function setField(field: keyof MemberPayload, value: string): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="page">
      <h1>Miembros</h1>

      {actionError && (
        <p role="alert" className="error">
          {actionError}
        </p>
      )}

      {canWrite && (
        <FormPanel label="Nuevo miembro" forceOpen={editingId !== null}>
          <form
            className="form"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            <h2>{editingId ? 'Editar miembro' : 'Nuevo miembro'}</h2>
            <label>
              Nombre completo
              <input
                required
                value={form.fullName}
                onChange={(event) => {
                  setField('fullName', event.target.value);
                }}
              />
            </label>
            <label>
              Teléfono
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => {
                  setField('phone', event.target.value);
                }}
              />
            </label>
            <label>
              Correo electrónico
              <input
                type="email"
                value={form.email}
                onChange={(event) => {
                  setField('email', event.target.value);
                }}
              />
            </label>
            <label>
              Fecha de ingreso
              <input
                type="date"
                value={form.joinedOn}
                onChange={(event) => {
                  setField('joinedOn', event.target.value);
                }}
              />
            </label>
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Registrar miembro'}
            </button>
            {editingId && (
              <button type="button" className="button--secondary" onClick={cancelEdit}>
                Cancelar
              </button>
            )}
          </form>
        </FormPanel>
      )}

      <div className="form">
        <label>
          Buscar por nombre
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
        </label>
        <label>
          Estado
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ActiveFilter);
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loadState === 'loading' && <p className="status">Cargando…</p>}
      {loadState === 'ready' && members.length === 0 && (
        <p className="status">No hay miembros que coincidan.</p>
      )}
      {loadState === 'ready' && (
        <ul className="cards">
          {members.map((member) => (
            <li key={member.id} className={member.active ? 'card' : 'card card--inactive'}>
              <strong>{member.fullName}</strong>
              {member.phone && <span>{member.phone}</span>}
              {member.email && <span>{member.email}</span>}
              <span>Ingreso: {member.joinedOn}</span>
              {!member.active && <span>Inactivo</span>}
              {canWrite && (
                <>
                  <button
                    type="button"
                    className="button--secondary"
                    onClick={() => {
                      startEdit(member);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleToggleActive(member);
                    }}
                  >
                    {member.active ? 'Desactivar' : 'Reactivar'}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
