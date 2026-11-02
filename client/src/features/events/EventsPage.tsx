import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { MemberPicker } from '../../components/MemberPicker';
import { listMembers, type Member } from '../members/api';
import { listMinistries, type Ministry } from '../ministries/api';
import {
  EVENT_CATEGORY_LABELS,
  EVENT_TYPE_LABELS,
  createEvent,
  listEvents,
  sendEventReminder,
  updateEvent,
  type ChurchEvent,
  type EventCategory,
  type EventPayload,
  type EventType,
} from './api';
import {
  WEEKDAY_SHORT,
  buildMonthGrid,
  formatLongDate,
  monthLabel,
  monthRange,
  shiftMonth,
  todayIso,
  type MonthRef,
} from './calendar';

type LoadState = 'loading' | 'ready' | 'error';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

function emptyForm(eventDate: string): EventPayload {
  return {
    title: '',
    description: '',
    eventDate,
    startTime: '10:00',
    location: '',
    type: 'religious',
    category: 'worship',
    ministryId: null,
    responsibleIds: [],
  };
}

function currentMonth(): MonthRef {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function EventsPage(): React.JSX.Element {
  const { user } = useAuth();
  // El tesorero solo consulta; el servidor también lo exige (403).
  const canWrite = user?.role === 'admin' || user?.role === 'pastor' || user?.role === 'secretary';

  const [month, setMonth] = useState<MonthRef>(currentMonth);
  const [selectedDay, setSelectedDay] = useState<string>(() => todayIso());
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventPayload>(() => emptyForm(todayIso()));
  const [saving, setSaving] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback((): void => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listEvents(monthRange(month))
      .then((list) => {
        if (cancelled) return;
        setEvents(list);
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
  }, [month, reloadKey]);

  // Miembros y ministerios solo se cargan para quien puede crear eventos.
  useEffect(() => {
    if (!canWrite) return;
    let cancelled = false;
    Promise.all([listMembers({ search: '', status: 'active' }), listMinistries()])
      .then(([loadedMembers, loadedMinistries]) => {
        if (cancelled) return;
        setMembers(loadedMembers);
        setMinistries(loadedMinistries.filter((ministry) => ministry.active));
      })
      .catch((error: unknown) => {
        if (!cancelled) setActionError(errorText(error));
      });
    return () => {
      cancelled = true;
    };
  }, [canWrite]);

  const eventsByDay = useMemo(() => {
    const byDay = new Map<string, ChurchEvent[]>();
    for (const event of events) {
      byDay.set(event.eventDate, [...(byDay.get(event.eventDate) ?? []), event]);
    }
    return byDay;
  }, [events]);

  const weeks = useMemo(() => buildMonthGrid(month), [month]);
  const dayEvents = eventsByDay.get(selectedDay) ?? [];

  function goToMonth(delta: number): void {
    const next = shiftMonth(month, delta);
    setMonth(next);
    setLoadState('loading');
    setSelectedDay(monthRange(next).from);
  }

  function selectDay(day: string): void {
    setSelectedDay(day);
    // Un día elegido sirve de fecha para un evento nuevo.
    if (!editingId) setForm((current) => ({ ...current, eventDate: day }));
  }

  async function run(action: () => Promise<void>, success: string): Promise<void> {
    setActionError(null);
    setMessage(null);
    setSaving(true);
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setActionError(errorText(error));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(event: ChurchEvent): void {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description ?? '',
      eventDate: event.eventDate,
      startTime: event.startTime,
      location: event.location ?? '',
      type: event.type,
      category: event.category,
      ministryId: event.ministryId,
      responsibleIds: event.responsibles.map((r) => r.id),
    });
  }

  function cancelEdit(): void {
    setEditingId(null);
    setForm(emptyForm(selectedDay));
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    void run(
      async () => {
        if (editingId) {
          await updateEvent(editingId, form);
        } else {
          await createEvent(form);
        }
        // Si el evento cae en otro mes, se salta a ese mes para verlo.
        const [year, monthNumber] = form.eventDate.split('-').map(Number);
        if (year !== undefined && monthNumber !== undefined) {
          setMonth({ year, month: monthNumber - 1 });
          setSelectedDay(form.eventDate);
        }
        setEditingId(null);
        setForm(emptyForm(form.eventDate));
        reload();
      },
      editingId ? 'Evento actualizado' : 'Evento creado',
    );
  }

  function handleToggleCancelled(event: ChurchEvent): void {
    const cancelling = event.status === 'scheduled';
    void run(
      async () => {
        await updateEvent(event.id, { status: cancelling ? 'cancelled' : 'scheduled' });
        reload();
      },
      cancelling ? 'Evento cancelado' : 'Evento reactivado',
    );
  }

  function handleRemind(event: ChurchEvent): void {
    setActionError(null);
    setMessage(null);
    setSaving(true);
    sendEventReminder(event.id)
      .then((result) => {
        const extras = [
          result.withoutEmail > 0 ? `${String(result.withoutEmail)} sin correo` : '',
          result.failed > 0 ? `${String(result.failed)} con error` : '',
        ].filter(Boolean);
        setMessage(
          `Recordatorios enviados: ${String(result.sent)}${extras.length > 0 ? ` (${extras.join(', ')})` : ''}`,
        );
      })
      .catch((error: unknown) => {
        setActionError(errorText(error));
      })
      .finally(() => {
        setSaving(false);
      });
  }

  function setField<K extends keyof EventPayload>(field: K, value: EventPayload[K]): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="page">
      <p>
        <Link to="/">← Inicio</Link>
      </p>
      <h1>Eventos</h1>

      {actionError && (
        <p role="alert" className="error">
          {actionError}
        </p>
      )}
      {message && <p role="status">{message}</p>}

      <section aria-label="Calendario">
        <div className="calendar__header">
          <button
            type="button"
            className="button--secondary"
            aria-label="Mes anterior"
            onClick={() => {
              goToMonth(-1);
            }}
          >
            ‹
          </button>
          <h2>{monthLabel(month)}</h2>
          <button
            type="button"
            className="button--secondary"
            aria-label="Mes siguiente"
            onClick={() => {
              goToMonth(1);
            }}
          >
            ›
          </button>
        </div>
        <div className="calendar" role="grid">
          {WEEKDAY_SHORT.map((name) => (
            <span key={name} className="calendar__weekday" role="columnheader">
              {name}
            </span>
          ))}
          {weeks.flat().map((day, index) => {
            if (day === null) return <span key={`empty-${String(index)}`} />;
            const count = eventsByDay.get(day)?.length ?? 0;
            const dayNumber = Number(day.slice(8));
            return (
              <button
                key={day}
                type="button"
                className={
                  day === selectedDay ? 'calendar__day calendar__day--selected' : 'calendar__day'
                }
                aria-label={`${formatLongDate(day)}${count > 0 ? `, ${String(count)} eventos` : ''}`}
                aria-pressed={day === selectedDay}
                onClick={() => {
                  selectDay(day);
                }}
              >
                {dayNumber}
                {count > 0 && <span className="calendar__badge">{count}</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Eventos del día">
        <h2>{formatLongDate(selectedDay)}</h2>
        {loadState === 'loading' && <p className="status">Cargando…</p>}
        {loadState === 'ready' && dayEvents.length === 0 && (
          <p className="status">No hay eventos este día.</p>
        )}
        <ul className="cards">
          {dayEvents.map((event) => (
            <li
              key={event.id}
              className={event.status === 'cancelled' ? 'card card--inactive' : 'card'}
            >
              <strong>{event.title}</strong>
              <span>
                {event.startTime} · {EVENT_TYPE_LABELS[event.type]} ·{' '}
                {EVENT_CATEGORY_LABELS[event.category]}
              </span>
              {event.location && <span>Lugar: {event.location}</span>}
              {event.description && <span>{event.description}</span>}
              {event.ministryName && <span>Ministerio: {event.ministryName}</span>}
              {event.responsibles.length > 0 && (
                <span>Responsables: {event.responsibles.map((r) => r.fullName).join(', ')}</span>
              )}
              {event.status === 'cancelled' && <span>Cancelado</span>}
              {canWrite && (
                <>
                  <button
                    type="button"
                    className="button--secondary"
                    onClick={() => {
                      startEdit(event);
                    }}
                  >
                    Editar
                  </button>
                  {event.status === 'scheduled' && event.responsibles.length > 0 && (
                    <button
                      type="button"
                      className="button--secondary"
                      disabled={saving}
                      onClick={() => {
                        handleRemind(event);
                      }}
                    >
                      Enviar recordatorio
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      handleToggleCancelled(event);
                    }}
                  >
                    {event.status === 'cancelled' ? 'Reactivar' : 'Cancelar evento'}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {canWrite && (
        <form className="form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Editar evento' : 'Nuevo evento'}</h2>
          <label>
            Título
            <input
              required
              value={form.title}
              onChange={(event) => {
                setField('title', event.target.value);
              }}
            />
          </label>
          <label>
            Fecha
            <input
              required
              type="date"
              value={form.eventDate}
              onChange={(event) => {
                setField('eventDate', event.target.value);
              }}
            />
          </label>
          <label>
            Hora
            <input
              required
              type="time"
              value={form.startTime}
              onChange={(event) => {
                setField('startTime', event.target.value);
              }}
            />
          </label>
          <label>
            Lugar
            <input
              value={form.location}
              onChange={(event) => {
                setField('location', event.target.value);
              }}
            />
          </label>
          <label>
            Descripción
            <input
              value={form.description}
              onChange={(event) => {
                setField('description', event.target.value);
              }}
            />
          </label>
          <label>
            Tipo
            <select
              value={form.type}
              onChange={(event) => {
                setField('type', event.target.value as EventType);
              }}
            >
              {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoría
            <select
              value={form.category}
              onChange={(event) => {
                setField('category', event.target.value as EventCategory);
              }}
            >
              {Object.entries(EVENT_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ministerio (opcional)
            <select
              value={form.ministryId ?? ''}
              onChange={(event) => {
                setField('ministryId', event.target.value || null);
              }}
            >
              <option value="">Ninguno</option>
              {ministries.map((ministry) => (
                <option key={ministry.id} value={ministry.id}>
                  {ministry.name}
                </option>
              ))}
            </select>
          </label>
          <MemberPicker
            legend="Responsables"
            members={members}
            selectedIds={form.responsibleIds}
            disabled={saving}
            onChange={(ids) => {
              setField('responsibleIds', ids);
            }}
          />
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear evento'}
          </button>
          {editingId && (
            <button type="button" className="button--secondary" onClick={cancelEdit}>
              Cancelar edición
            </button>
          )}
        </form>
      )}
    </main>
  );
}
