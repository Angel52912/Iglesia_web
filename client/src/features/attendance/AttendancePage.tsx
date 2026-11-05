import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { EVENT_CATEGORY_LABELS, listEvents, type ChurchEvent } from '../events/api';
import { formatLongDate, todayIso } from '../events/calendar';
import { listMembers, type Member } from '../members/api';
import {
  getAttendanceReport,
  getEventAttendance,
  listAttendanceHistory,
  saveEventAttendance,
  type AttendanceReport,
  type AttendanceSummary,
  type ReportPeriod,
} from './api';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

function SummaryList({ items }: { items: AttendanceSummary[] }): React.JSX.Element {
  if (items.length === 0) return <p className="status">Sin asistencia registrada.</p>;
  return (
    <ul className="cards">
      {items.map((item) => (
        <li key={item.eventId} className="card">
          <strong>{item.title}</strong>
          <p>
            {formatLongDate(item.eventDate)} · {EVENT_CATEGORY_LABELS[item.category]}
          </p>
          <p>
            Presentes: {item.present} · Ausentes: {item.absent}
          </p>
        </li>
      ))}
    </ul>
  );
}

interface RegisterProps {
  canWrite: boolean;
}

// Elegir fecha y evento, y marcar presentes; quien no marca queda ausente.
function RegisterSection({ canWrite }: RegisterProps): React.JSX.Element {
  const [date, setDate] = useState<string>(() => todayIso());
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [eventId, setEventId] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMembers({ search: '', status: 'active' })
      .then((list) => {
        if (!cancelled) setMembers(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorText(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    listEvents({ from: date, to: date, status: 'scheduled' })
      .then((list) => {
        if (cancelled) return;
        setEvents(list);
        setPresentIds([]);
        setEventId(list[0]?.id ?? '');
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorText(e));
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    getEventAttendance(eventId)
      .then(({ records }) => {
        if (!cancelled) setPresentIds(records.filter((r) => r.present).map((r) => r.memberId));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorText(e));
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  function toggle(id: string): void {
    setPresentIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  async function handleSave(): Promise<void> {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await saveEventAttendance(
        eventId,
        members.map((m) => ({ memberId: m.id, present: presentIds.includes(m.id) })),
      );
      setMessage('Asistencia guardada');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="form" aria-label="Registrar asistencia">
      <h2>{canWrite ? 'Registrar asistencia' : 'Consultar asistencia'}</h2>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <label>
        Fecha
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setMessage(null);
          }}
        />
      </label>
      <label>
        Evento
        <select
          value={eventId}
          onChange={(e) => {
            setPresentIds([]);
            setEventId(e.target.value);
            setMessage(null);
          }}
        >
          {events.length === 0 && <option value="">No hay eventos ese día</option>}
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.startTime} · {event.title}
            </option>
          ))}
        </select>
      </label>
      {eventId && (
        <fieldset className="picker">
          <legend>
            Presentes: {presentIds.length} de {members.length}
          </legend>
          {members.map((member) => (
            <label key={member.id} className="picker__option">
              <input
                type="checkbox"
                checked={presentIds.includes(member.id)}
                disabled={!canWrite}
                onChange={() => {
                  toggle(member.id);
                }}
              />
              {member.fullName}
            </label>
          ))}
        </fieldset>
      )}
      {eventId && canWrite && (
        <div className="actions">
          <button
            type="button"
            className="button--secondary"
            onClick={() => {
              setPresentIds(members.map((m) => m.id));
            }}
          >
            Todos presentes
          </button>
          <button
            type="button"
            disabled={saving || members.length === 0}
            onClick={() => {
              void handleSave();
            }}
          >
            {saving ? 'Guardando…' : 'Guardar asistencia'}
          </button>
        </div>
      )}
    </section>
  );
}

function HistorySection(): React.JSX.Element {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [items, setItems] = useState<AttendanceSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAttendanceHistory({ from, to })
      .then((list) => {
        if (cancelled) return;
        setError(null);
        setItems(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorText(e));
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return (
    <section className="form" aria-label="Historial de asistencia">
      <h2>Historial</h2>
      <label>
        Desde
        <input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
          }}
        />
      </label>
      <label>
        Hasta
        <input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
          }}
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {items === null && !error && <p className="status">Cargando…</p>}
      {items && <SummaryList items={items} />}
    </section>
  );
}

function ReportSection(): React.JSX.Element {
  const [period, setPeriod] = useState<ReportPeriod>('week');
  const [date, setDate] = useState<string>(() => todayIso());
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    getAttendanceReport(period, date)
      .then((loaded) => {
        if (cancelled) return;
        setError(null);
        setReport(loaded);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorText(e));
      });
    return () => {
      cancelled = true;
    };
  }, [period, date]);

  return (
    <section className="form" aria-label="Reporte de asistencia">
      <h2>Reporte</h2>
      <label>
        Periodo
        <select
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value === 'month' ? 'month' : 'week');
          }}
        >
          <option value="week">Semanal</option>
          <option value="month">Mensual</option>
        </select>
      </label>
      <label>
        Fecha dentro del periodo
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
          }}
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {report && (
        <>
          <p>
            Del {formatLongDate(report.from)} al {formatLongDate(report.to)}: {report.totals.events}{' '}
            eventos · {report.totals.present} presentes · {report.totals.absent} ausentes
          </p>
          <SummaryList items={report.events} />
        </>
      )}
    </section>
  );
}

export function AttendancePage(): React.JSX.Element {
  const { user } = useAuth();
  // El pastor solo consulta; el servidor también lo exige (403).
  const canWrite = user?.role === 'admin' || user?.role === 'secretary';

  return (
    <main className="page">
      <h1>Asistencia</h1>
      <RegisterSection canWrite={canWrite} />
      <HistorySection />
      <ReportSection />
    </main>
  );
}
