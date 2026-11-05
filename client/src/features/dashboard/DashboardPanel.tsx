import { useEffect, useState } from 'react';
import { Icon, type IconName } from '../../components/Icon';
import {
  getDashboard,
  type DashboardData,
  type EventAttendanceBar,
  type IncomeStats,
  type MonthIncome,
} from './api';

type LoadState = 'loading' | 'ready' | 'error';

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

// "2026-11-02" -> "02/11/2026"
function formatDate(iso: string): string {
  const [year = '', month = '', day = ''] = iso.split('-');
  return `${day}/${month}/${year}`;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// "2026-11-02" -> "nov"
function monthShort(iso: string): string {
  return MONTHS[Number(iso.slice(5, 7)) - 1] ?? '';
}

function AttendanceChart({ bars }: { bars: EventAttendanceBar[] }): React.JSX.Element {
  return (
    <section className="panel" aria-labelledby="chart-attendance">
      <h3 id="chart-attendance">Asistencia de los últimos eventos</h3>
      {bars.length === 0 && <p className="status">Aún no hay asistencia registrada.</p>}
      <ul className="bars">
        {bars.map((bar) => {
          const total = bar.present + bar.absent;
          const percent = total === 0 ? 0 : Math.round((bar.present / total) * 100);
          return (
            <li key={bar.eventId} className="bars__row">
              <span className="bars__label">
                {bar.title} · {formatDate(bar.eventDate)}
              </span>
              <span className="bars__track" aria-hidden="true">
                <span className="bars__fill" style={{ width: `${String(percent)}%` }} />
              </span>
              <span className="bars__value">
                {bar.present} presentes, {bar.absent} ausentes ({percent} %)
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function IncomeChart({ months }: { months: MonthIncome[] }): React.JSX.Element {
  const max = Math.max(...months.map((item) => item.total), 0);
  return (
    <section className="panel" aria-labelledby="chart-income">
      <h3 id="chart-income">Ingresos de los últimos 6 meses</h3>
      <ul className="bars">
        {months.map((item) => (
          <li key={item.month} className="bars__row">
            <span className="bars__label">{item.month}</span>
            <span className="bars__track" aria-hidden="true">
              <span
                className="bars__fill"
                style={{
                  width: `${String(max === 0 ? 0 : Math.round((item.total / max) * 100))}%`,
                }}
              />
            </span>
            <span className="bars__value">{money.format(item.total)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatIcon({ name }: { name: IconName }): React.JSX.Element {
  return (
    <span className="stat-icon">
      <Icon name={name} size={20} />
    </span>
  );
}

function IncomeCard({ income }: { income: IncomeStats }): React.JSX.Element {
  return (
    <li className="card card--stat card--accent">
      <StatIcon name="money" />
      <span>Ingresos de {income.month}</span>
      <strong className="stat">{money.format(income.monthTotal)}</strong>
      <span>{income.monthDonations} donaciones</span>
    </li>
  );
}

// Panel principal (RF-08). Qué bloques llegan lo decide el servidor según el rol.
export function DashboardPanel(): React.JSX.Element {
  const [state, setState] = useState<LoadState>('loading');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getDashboard()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setState('ready');
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(errorText(caught));
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') return <p className="status">Cargando panel…</p>;
  if (state === 'error' || !data) return <p className="error">{error}</p>;

  const { general, income } = data;
  return (
    <section aria-label="Panel principal">
      <ul className="cards cards--stats">
        {general && (
          <>
            <li className="card card--stat">
              <StatIcon name="members" />
              <span>Miembros activos</span>
              <strong className="stat">{general.activeMembers}</strong>
            </li>
            <li className="card card--stat">
              <StatIcon name="calendar" />
              <span>Eventos próximos</span>
              <strong className="stat">{general.upcomingCount}</strong>
            </li>
            <li className="card card--stat">
              <StatIcon name="attendance" />
              <span>Asistencias registradas</span>
              <strong className="stat">{general.attendance.present}</strong>
              <span>de {general.attendance.total} marcas</span>
            </li>
            <li className="card card--stat">
              <StatIcon name="ministries" />
              <span>Ministerios</span>
              <strong className="stat">{general.ministries}</strong>
            </li>
          </>
        )}
        {income && <IncomeCard income={income} />}
      </ul>

      {general && (
        <section aria-labelledby="upcoming-events">
          <h3 id="upcoming-events">Próximos eventos</h3>
          {general.upcomingEvents.length === 0 && (
            <p className="status">No hay eventos próximos.</p>
          )}
          <ul className="cards">
            {general.upcomingEvents.map((event) => (
              <li key={event.id} className="card card--event">
                <span className="date-chip" aria-hidden="true">
                  <span className="date-chip__day">{event.eventDate.slice(8, 10)}</span>
                  <span className="date-chip__month">{monthShort(event.eventDate)}</span>
                </span>
                <span className="card--event__body">
                  <strong>{event.title}</strong>
                  <span>
                    {formatDate(event.eventDate)} · {event.startTime}
                    {event.location ? ` · ${event.location}` : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {general && <AttendanceChart bars={general.attendanceByEvent} />}
      {income && <IncomeChart months={income.byMonth} />}
    </section>
  );
}
