import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { formatLongDate, todayIso } from '../events/calendar';
import { listEvents, type ChurchEvent } from '../events/api';
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  updateAnnouncement,
  type Announcement,
  type AnnouncementPayload,
} from './api';

type LoadState = 'loading' | 'ready' | 'error';

const UPCOMING_LIMIT = 5;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

function emptyForm(): AnnouncementPayload {
  return { title: '', body: '', important: false, publishedOn: todayIso() };
}

export function AnnouncementsPage(): React.JSX.Element {
  const { user } = useAuth();
  // El coordinador solo lee; el servidor también lo exige (403).
  const canWrite = user?.role === 'admin' || user?.role === 'pastor' || user?.role === 'secretary';
  // El coordinador aún no puede consultar eventos (llega con coordinator_policies).
  const canSeeEvents = canWrite;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [upcoming, setUpcoming] = useState<ChurchEvent[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementPayload>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback((): void => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const list = await listAnnouncements();
        if (cancelled) return;
        setAnnouncements(list);
        setLoadState('ready');
      } catch (error) {
        if (cancelled) return;
        setActionError(errorText(error));
        setLoadState('error');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!canSeeEvents) return;
    let cancelled = false;
    listEvents({ from: todayIso(), status: 'scheduled' })
      .then((events) => {
        if (!cancelled) setUpcoming(events.slice(0, UPCOMING_LIMIT));
      })
      .catch((error: unknown) => {
        if (!cancelled) setActionError(errorText(error));
      });
    return () => {
      cancelled = true;
    };
  }, [canSeeEvents]);

  function setField<K extends keyof AnnouncementPayload>(
    field: K,
    value: AnnouncementPayload[K],
  ): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(announcement: Announcement): void {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      body: announcement.body,
      important: announcement.important,
      publishedOn: announcement.publishedOn,
    });
  }

  function cancelEdit(): void {
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setActionError(null);
    setSaving(true);
    try {
      if (editingId) {
        await updateAnnouncement(editingId, form);
      } else {
        await createAnnouncement(form);
      }
      cancelEdit();
      reload();
    } catch (error) {
      setActionError(errorText(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(announcement: Announcement): Promise<void> {
    if (!window.confirm('¿Eliminar este comunicado? No se puede deshacer.')) return;
    setActionError(null);
    try {
      await deleteAnnouncement(announcement.id);
      if (editingId === announcement.id) cancelEdit();
      reload();
    } catch (error) {
      setActionError(errorText(error));
    }
  }

  const important = announcements.filter((announcement) => announcement.important);

  return (
    <main className="page">
      <p>
        <Link to="/">← Inicio</Link>
      </p>
      <h1>Comunicados</h1>

      {actionError && (
        <p role="alert" className="error">
          {actionError}
        </p>
      )}

      {loadState === 'loading' && <p className="status">Cargando…</p>}

      {canSeeEvents && upcoming.length > 0 && (
        <section aria-label="Próximos eventos">
          <h2>Próximos eventos</h2>
          <ul className="cards">
            {upcoming.map((event) => (
              <li key={event.id} className="card">
                <strong>{event.title}</strong>
                <span>
                  {formatLongDate(event.eventDate)} · {event.startTime}
                </span>
                {event.location && <span>{event.location}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {important.length > 0 && (
        <section aria-label="Avisos importantes">
          <h2>Avisos importantes</h2>
          <ul className="cards">
            {important.map((announcement) => (
              <li key={announcement.id} className="card card--important">
                <strong>{announcement.title}</strong>
                <span>{announcement.body}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canWrite && (
        <form
          className="form"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <h2>{editingId ? 'Editar comunicado' : 'Publicar comunicado'}</h2>
          <label>
            Título
            <input
              required
              maxLength={120}
              value={form.title}
              onChange={(event) => {
                setField('title', event.target.value);
              }}
            />
          </label>
          <label>
            Mensaje
            <textarea
              required
              rows={4}
              maxLength={2000}
              value={form.body}
              onChange={(event) => {
                setField('body', event.target.value);
              }}
            />
          </label>
          <label>
            Fecha de publicación
            <input
              required
              type="date"
              value={form.publishedOn}
              onChange={(event) => {
                setField('publishedOn', event.target.value);
              }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.important}
              onChange={(event) => {
                setField('important', event.target.checked);
              }}
            />{' '}
            Aviso importante
          </label>
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Publicar'}
          </button>
          {editingId && (
            <button type="button" className="button--secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </form>
      )}

      {loadState === 'ready' && (
        <section aria-label="Todos los comunicados">
          <h2>Todos los comunicados</h2>
          {announcements.length === 0 && <p className="status">No hay comunicados.</p>}
          <ul className="cards">
            {announcements.map((announcement) => (
              <li
                key={announcement.id}
                className={announcement.important ? 'card card--important' : 'card'}
              >
                <strong>{announcement.title}</strong>
                <span>{announcement.body}</span>
                <span>
                  Publicado: {announcement.publishedOn}
                  {announcement.important && ' · Importante'}
                </span>
                {canWrite && (
                  <>
                    <button
                      type="button"
                      className="button--secondary"
                      onClick={() => {
                        startEdit(announcement);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleDelete(announcement);
                      }}
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
