import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { useAuth } from '../../auth/useAuth';
import { FormPanel } from '../../components/FormPanel';
import { MemberPicker } from '../../components/MemberPicker';
import { todayIso, formatLongDate } from '../events/calendar';
import { listEvents, type ChurchEvent } from '../events/api';
import { listMembers, type Member } from '../members/api';
import {
  createMinistry,
  getMinistry,
  listMinistries,
  setCoordinators,
  setMembers,
  updateMinistry,
  type Ministry,
  type MinistryDetail,
  type MinistryPayload,
} from './api';

type LoadState = 'loading' | 'ready' | 'error';

const EMPTY_FORM: MinistryPayload = { name: '', description: '' };

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

export function MinistriesPage(): React.JSX.Element {
  const { user } = useAuth();
  // El secretario solo consulta; el servidor también lo exige (403).
  const canWrite = user?.role === 'admin' || user?.role === 'pastor';

  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MinistryPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<MinistryDetail | null>(null);
  const [upcoming, setUpcoming] = useState<ChurchEvent[]>([]);
  const [activeMembers, setActiveMembers] = useState<Member[]>([]);
  const [coordinatorIds, setCoordinatorIds] = useState<string[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback((): void => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listMinistries()
      .then((list) => {
        if (cancelled) return;
        setMinistries(list);
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

  function showDetail(next: MinistryDetail): void {
    setDetail(next);
    setCoordinatorIds(next.coordinators.map((c) => c.id));
    setMemberIds(next.members.map((m) => m.id));
  }

  async function run(action: () => Promise<void>, success: string | null): Promise<void> {
    setActionError(null);
    setMessage(null);
    setSaving(true);
    try {
      await action();
      if (success) setMessage(success);
    } catch (error) {
      setActionError(errorText(error));
    } finally {
      setSaving(false);
    }
  }

  function openDetail(id: string): void {
    void run(async () => {
      const [loaded, events] = await Promise.all([
        getMinistry(id),
        listEvents({ ministryId: id, from: todayIso(), status: 'scheduled' }),
      ]);
      // Solo quien puede editar necesita la lista de miembros para elegir.
      if (canWrite) setActiveMembers(await listMembers({ search: '', status: 'active' }));
      setUpcoming(events);
      showDetail(loaded);
    }, null);
  }

  function startEdit(ministry: Ministry): void {
    setEditingId(ministry.id);
    setForm({ name: ministry.name, description: ministry.description ?? '' });
  }

  function cancelEdit(): void {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    void run(
      async () => {
        if (editingId) {
          await updateMinistry(editingId, form);
        } else {
          await createMinistry(form);
        }
        cancelEdit();
        reload();
      },
      editingId ? 'Ministerio actualizado' : 'Ministerio registrado',
    );
  }

  function handleToggleActive(ministry: Ministry): void {
    void run(async () => {
      await updateMinistry(ministry.id, { active: !ministry.active });
      reload();
    }, null);
  }

  function handleSaveCoordinators(): void {
    if (!detail) return;
    void run(async () => {
      showDetail(await setCoordinators(detail.id, coordinatorIds));
      reload();
    }, 'Coordinadores guardados');
  }

  function handleSaveMembers(): void {
    if (!detail) return;
    void run(async () => {
      showDetail(await setMembers(detail.id, memberIds));
      reload();
    }, 'Integrantes guardados');
  }

  return (
    <main className="page">
      <h1>Ministerios</h1>

      {actionError && (
        <p role="alert" className="error">
          {actionError}
        </p>
      )}
      {message && <p role="status">{message}</p>}

      {canWrite && (
        <FormPanel label="Nuevo ministerio" forceOpen={editingId !== null}>
          <form className="form" onSubmit={handleSubmit}>
            <h2>{editingId ? 'Editar ministerio' : 'Nuevo ministerio'}</h2>
            <label>
              Nombre
              <input
                required
                value={form.name}
                onChange={(event) => {
                  setForm((current) => ({ ...current, name: event.target.value }));
                }}
              />
            </label>
            <label>
              Descripción
              <input
                value={form.description}
                onChange={(event) => {
                  setForm((current) => ({ ...current, description: event.target.value }));
                }}
              />
            </label>
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Registrar ministerio'}
            </button>
            {editingId && (
              <button type="button" className="button--secondary" onClick={cancelEdit}>
                Cancelar
              </button>
            )}
          </form>
        </FormPanel>
      )}

      {loadState === 'loading' && <p className="status">Cargando…</p>}
      {loadState === 'ready' && ministries.length === 0 && (
        <p className="status">Aún no hay ministerios registrados.</p>
      )}
      {loadState === 'ready' && (
        <ul className="cards">
          {ministries.map((ministry) => (
            <li key={ministry.id} className={ministry.active ? 'card' : 'card card--inactive'}>
              <strong>{ministry.name}</strong>
              {ministry.description && <span>{ministry.description}</span>}
              <span>
                Coordinadores:{' '}
                {ministry.coordinators.length > 0
                  ? ministry.coordinators.map((c) => c.fullName).join(', ')
                  : 'sin asignar'}
              </span>
              <span>Integrantes: {ministry.memberCount}</span>
              {!ministry.active && <span>Inactivo</span>}
              <button
                type="button"
                className="button--secondary"
                disabled={saving}
                onClick={() => {
                  openDetail(ministry.id);
                }}
              >
                Ver integrantes y actividades
              </button>
              {canWrite && (
                <>
                  <button
                    type="button"
                    className="button--secondary"
                    onClick={() => {
                      startEdit(ministry);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      handleToggleActive(ministry);
                    }}
                  >
                    {ministry.active ? 'Desactivar' : 'Reactivar'}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {detail && (
        <section className="form" aria-label={`Detalle de ${detail.name}`}>
          <h2>{detail.name}</h2>

          <h3>Próximas actividades</h3>
          {upcoming.length === 0 && <p className="status">No hay actividades programadas.</p>}
          <ul className="cards">
            {upcoming.map((event) => (
              <li key={event.id} className="card">
                <strong>{event.title}</strong>
                <span>
                  {formatLongDate(event.eventDate)} a las {event.startTime}
                </span>
                {event.location && <span>{event.location}</span>}
              </li>
            ))}
          </ul>

          {canWrite ? (
            <>
              <MemberPicker
                legend="Coordinadores"
                members={activeMembers}
                selectedIds={coordinatorIds}
                disabled={saving}
                onChange={setCoordinatorIds}
              />
              <button type="button" disabled={saving} onClick={handleSaveCoordinators}>
                Guardar coordinadores
              </button>
              <MemberPicker
                legend="Integrantes"
                members={activeMembers}
                selectedIds={memberIds}
                disabled={saving}
                onChange={setMemberIds}
              />
              <button type="button" disabled={saving} onClick={handleSaveMembers}>
                Guardar integrantes
              </button>
            </>
          ) : (
            <>
              <h3>Integrantes</h3>
              {detail.members.length === 0 && <p className="status">Sin integrantes.</p>}
              <ul>
                {detail.members.map((member) => (
                  <li key={member.id}>{member.fullName}</li>
                ))}
              </ul>
            </>
          )}
          <button
            type="button"
            className="button--secondary"
            onClick={() => {
              setDetail(null);
            }}
          >
            Cerrar
          </button>
        </section>
      )}
    </main>
  );
}
