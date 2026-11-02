import type { EventCategory, EventStatus } from '../events/events.types.js';

export const REPORT_PERIODS = ['week', 'month'] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

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

export interface AttendanceMark {
  memberId: string;
  present: boolean;
}

export interface EventAttendance {
  event: AttendanceEvent;
  records: AttendanceRecord[];
}

export interface AttendanceSummary {
  eventId: string;
  title: string;
  eventDate: string;
  category: EventCategory;
  present: number;
  absent: number;
}

export interface HistoryFilters {
  from?: string | undefined;
  to?: string | undefined;
  eventId?: string | undefined;
}

export interface AttendanceReport {
  period: ReportPeriod;
  from: string;
  to: string;
  totals: { events: number; present: number; absent: number };
  events: AttendanceSummary[];
}

// Acceso a attendance_records con el JWT del usuario (RLS aplica).
export interface AttendanceRepository {
  findEvent(eventId: string): Promise<AttendanceEvent | null>;
  listForEvent(eventId: string): Promise<AttendanceRecord[]>;
  save(eventId: string, marks: AttendanceMark[]): Promise<void>;
  summaries(filters: HistoryFilters): Promise<AttendanceSummary[]>;
}
