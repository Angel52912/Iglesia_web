import { HttpError } from '../../errors.js';
import type {
  AttendanceMark,
  AttendanceReport,
  AttendanceRepository,
  AttendanceSummary,
  EventAttendance,
  HistoryFilters,
  ReportPeriod,
} from './attendance.types.js';

const DAY_MS = 86_400_000;

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Semana de lunes a domingo o mes calendario que contiene la fecha (fechas ISO, sin zona horaria).
export function reportRange(period: ReportPeriod, date: string): { from: string; to: string } {
  const day = new Date(`${date}T00:00:00Z`);
  if (period === 'month') {
    const first = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
    const last = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0));
    return { from: toIso(first), to: toIso(last) };
  }
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  const monday = new Date(day.getTime() - sinceMonday * DAY_MS);
  return { from: toIso(monday), to: toIso(new Date(monday.getTime() + 6 * DAY_MS)) };
}

export class AttendanceService {
  constructor(private readonly attendance: AttendanceRepository) {}

  async getForEvent(eventId: string): Promise<EventAttendance> {
    const event = await this.attendance.findEvent(eventId);
    if (!event) throw new HttpError(404, 'Evento no encontrado');
    return { event, records: await this.attendance.listForEvent(eventId) };
  }

  async save(eventId: string, marks: AttendanceMark[]): Promise<EventAttendance> {
    const event = await this.attendance.findEvent(eventId);
    if (!event) throw new HttpError(404, 'Evento no encontrado');
    if (event.status === 'cancelled') {
      throw new HttpError(409, 'No se puede registrar asistencia de un evento cancelado');
    }
    await this.attendance.save(eventId, marks);
    return { event, records: await this.attendance.listForEvent(eventId) };
  }

  history(filters: HistoryFilters): Promise<AttendanceSummary[]> {
    return this.attendance.summaries(filters);
  }

  async report(period: ReportPeriod, date: string): Promise<AttendanceReport> {
    const range = reportRange(period, date);
    const events = await this.attendance.summaries(range);
    const totals = events.reduce(
      (sum, item) => ({
        events: sum.events + 1,
        present: sum.present + item.present,
        absent: sum.absent + item.absent,
      }),
      { events: 0, present: 0, absent: 0 },
    );
    return { period, ...range, totals, events };
  }
}
