import { apiRequest } from '../../lib/apiClient';
import type { EventCategory, EventStatus } from '../events/api';

export type ReportPeriod = 'week' | 'month';

export interface AttendanceEvent {
  id: string;
  title: string;
  eventDate: string;
  category: EventCategory;
  status: EventStatus;
}

export interface AttendanceRecord {
  memberId: string;
  fullName: string;
  present: boolean;
}

export interface EventAttendance {
  event: AttendanceEvent;
  records: AttendanceRecord[];
}

export interface AttendanceMark {
  memberId: string;
  present: boolean;
}

export interface AttendanceSummary {
  eventId: string;
  title: string;
  eventDate: string;
  category: EventCategory;
  present: number;
  absent: number;
}

export interface AttendanceReport {
  period: ReportPeriod;
  from: string;
  to: string;
  totals: { events: number; present: number; absent: number };
  events: AttendanceSummary[];
}

export function getEventAttendance(eventId: string): Promise<EventAttendance> {
  return apiRequest<EventAttendance>(`/api/attendance/events/${eventId}`);
}

export function saveEventAttendance(
  eventId: string,
  records: AttendanceMark[],
): Promise<EventAttendance> {
  return apiRequest<EventAttendance>(`/api/attendance/events/${eventId}`, {
    method: 'PUT',
    body: { records },
  });
}

export async function listAttendanceHistory(range: {
  from?: string;
  to?: string;
}): Promise<AttendanceSummary[]> {
  const params = new URLSearchParams();
  if (range.from) params.set('from', range.from);
  if (range.to) params.set('to', range.to);
  const query = params.toString();
  const { history } = await apiRequest<{ history: AttendanceSummary[] }>(
    `/api/attendance/history${query ? `?${query}` : ''}`,
  );
  return history;
}

export async function getAttendanceReport(
  period: ReportPeriod,
  date: string,
): Promise<AttendanceReport> {
  const { report } = await apiRequest<{ report: AttendanceReport }>(
    `/api/attendance/report?period=${period}&date=${date}`,
  );
  return report;
}
