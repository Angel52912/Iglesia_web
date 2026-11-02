import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../../errors.js';
import { toDbError } from '../shared/dbError.js';
import {
  EVENT_REF_COLUMNS,
  eventRefRowSchema,
  recordRowSchema,
  summaryRowSchema,
  type SummaryRow,
} from './attendance.row.js';
import type {
  AttendanceEvent,
  AttendanceMark,
  AttendanceRecord,
  AttendanceRepository,
  AttendanceSummary,
  HistoryFilters,
} from './attendance.types.js';

// PostgREST devuelve máximo 1000 filas por petición: se pagina para no truncar el conteo.
const PAGE_SIZE = 1000;

export function summarize(rows: SummaryRow[]): AttendanceSummary[] {
  const byEvent = new Map<string, AttendanceSummary>();
  for (const row of rows) {
    const current = byEvent.get(row.events.id) ?? {
      eventId: row.events.id,
      title: row.events.title,
      eventDate: row.events.event_date,
      category: row.events.category,
      present: 0,
      absent: 0,
    };
    if (row.present) current.present += 1;
    else current.absent += 1;
    byEvent.set(row.events.id, current);
  }
  return [...byEvent.values()].sort(
    (a, b) => b.eventDate.localeCompare(a.eventDate) || a.title.localeCompare(b.title),
  );
}

export class SupabaseAttendanceRepository implements AttendanceRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findEvent(eventId: string): Promise<AttendanceEvent | null> {
    const { data, error } = await this.db
      .from('events')
      .select(EVENT_REF_COLUMNS)
      .eq('id', eventId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = eventRefRowSchema.parse(data);
    return {
      id: row.id,
      title: row.title,
      eventDate: row.event_date,
      category: row.category,
      status: row.status,
    };
  }

  async listForEvent(eventId: string): Promise<AttendanceRecord[]> {
    const { data, error } = await this.db
      .from('attendance_records')
      .select('member_id,present,members(full_name)')
      .eq('event_id', eventId);
    if (error) throw new Error(error.message);
    return recordRowSchema
      .array()
      .parse(data)
      .map((row) => ({
        memberId: row.member_id,
        fullName: row.members?.full_name ?? '',
        present: row.present,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async save(eventId: string, marks: AttendanceMark[]): Promise<void> {
    const memberIds = marks.map((mark) => mark.memberId);
    const found = await this.db.from('members').select('id').in('id', memberIds);
    if (found.error) throw new Error(found.error.message);
    if (!Array.isArray(found.data) || found.data.length !== memberIds.length) {
      throw new HttpError(400, 'Algún miembro no existe');
    }
    const { error } = await this.db.from('attendance_records').upsert(
      marks.map((mark) => ({ event_id: eventId, member_id: mark.memberId, present: mark.present })),
      { onConflict: 'event_id,member_id' },
    );
    if (error) throw toDbError(error);
  }

  async summaries(filters: HistoryFilters): Promise<AttendanceSummary[]> {
    const rows: SummaryRow[] = [];
    for (let start = 0; ; start += PAGE_SIZE) {
      let query = this.db
        .from('attendance_records')
        .select('present,events!inner(id,title,event_date,category)')
        .order('event_id')
        .order('member_id')
        .range(start, start + PAGE_SIZE - 1);
      if (filters.from) query = query.gte('events.event_date', filters.from);
      if (filters.to) query = query.lte('events.event_date', filters.to);
      if (filters.eventId) query = query.eq('event_id', filters.eventId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const page = summaryRowSchema.array().parse(data);
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return summarize(rows);
  }
}
