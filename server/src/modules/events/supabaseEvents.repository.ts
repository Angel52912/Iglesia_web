import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../../errors.js';
import { toDbError } from '../shared/dbError.js';
import { EVENT_COLUMNS, eventRowSchema, insertedEventSchema, type EventRow } from './event.row.js';
import type {
  ChurchEvent,
  CreateEventInput,
  EventFilters,
  EventsRepository,
  Responsible,
  UpdateEventInput,
} from './events.types.js';

function toEvent(row: EventRow): ChurchEvent {
  const responsibles: Responsible[] = [];
  for (const link of row.event_responsibles) {
    if (link.members) {
      responsibles.push({ id: link.members.id, fullName: link.members.full_name });
    }
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    eventDate: row.event_date,
    // Postgres devuelve HH:MM:SS.
    startTime: row.start_time.slice(0, 5),
    location: row.location,
    type: row.type,
    category: row.category,
    status: row.status,
    ministryId: row.ministry_id,
    ministryName: row.ministries?.name ?? null,
    responsibles: responsibles.sort((a, b) => a.fullName.localeCompare(b.fullName)),
  };
}

export class SupabaseEventsRepository implements EventsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(filters: EventFilters): Promise<ChurchEvent[]> {
    let query = this.db
      .from('events')
      .select(EVENT_COLUMNS)
      .order('event_date')
      .order('start_time');
    if (filters.from) query = query.gte('event_date', filters.from);
    if (filters.to) query = query.lte('event_date', filters.to);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.ministryId) query = query.eq('ministry_id', filters.ministryId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return eventRowSchema.array().parse(data).map(toEvent);
  }

  async create(input: CreateEventInput): Promise<ChurchEvent> {
    // Se validan antes de insertar para no dejar un evento sin sus responsables.
    await this.assertMembersExist(input.responsibleIds);
    const { data, error } = await this.db
      .from('events')
      .insert({
        title: input.title,
        description: input.description,
        event_date: input.eventDate,
        start_time: input.startTime,
        location: input.location,
        type: input.type,
        category: input.category,
        ministry_id: input.ministryId,
      })
      .select('id')
      .single();
    if (error) throw toDbError(error);
    const { id } = insertedEventSchema.parse(data);
    await this.replaceResponsibles(id, input.responsibleIds);
    const created = await this.findById(id);
    if (!created) throw new Error('No se pudo leer el evento creado');
    return created;
  }

  async update(id: string, patch: UpdateEventInput): Promise<ChurchEvent | null> {
    if (!(await this.findById(id))) return null;

    const changes: Record<string, string | null> = {};
    if (patch.title !== undefined) changes.title = patch.title;
    if (patch.description !== undefined) changes.description = patch.description;
    if (patch.eventDate !== undefined) changes.event_date = patch.eventDate;
    if (patch.startTime !== undefined) changes.start_time = patch.startTime;
    if (patch.location !== undefined) changes.location = patch.location;
    if (patch.type !== undefined) changes.type = patch.type;
    if (patch.category !== undefined) changes.category = patch.category;
    if (patch.status !== undefined) changes.status = patch.status;
    if (patch.ministryId !== undefined) changes.ministry_id = patch.ministryId;

    if (Object.keys(changes).length > 0) {
      const { data, error } = await this.db
        .from('events')
        .update(changes)
        .eq('id', id)
        .select('id');
      if (error) throw toDbError(error);
      // Si RLS filtra el update no hay error: devuelve 0 filas.
      if (!Array.isArray(data) || data.length === 0) return null;
    }
    if (patch.responsibleIds !== undefined) {
      await this.replaceResponsibles(id, patch.responsibleIds);
    }
    return this.findById(id);
  }

  private async findById(id: string): Promise<ChurchEvent | null> {
    const { data, error } = await this.db
      .from('events')
      .select(EVENT_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toEvent(eventRowSchema.parse(data)) : null;
  }

  private async assertMembersExist(memberIds: string[]): Promise<void> {
    if (memberIds.length === 0) return;
    const { data, error } = await this.db.from('members').select('id').in('id', memberIds);
    if (error) throw new Error(error.message);
    if (!Array.isArray(data) || data.length !== memberIds.length) {
      throw new HttpError(400, 'Algún responsable no existe');
    }
  }

  // Agrega los nuevos y quita los que sobran; no toca a los que se quedan.
  private async replaceResponsibles(eventId: string, memberIds: string[]): Promise<void> {
    const current = await this.db
      .from('event_responsibles')
      .select('member_id')
      .eq('event_id', eventId);
    if (current.error) throw new Error(current.error.message);
    const existing = (current.data as { member_id: string }[]).map((row) => row.member_id);

    const toRemove = existing.filter((memberId) => !memberIds.includes(memberId));
    const toAdd = memberIds.filter((memberId) => !existing.includes(memberId));

    // Primero se agrega: si un miembro no existe falla antes de quitar a nadie.
    await this.assertMembersExist(toAdd);
    if (toAdd.length > 0) {
      const added = await this.db
        .from('event_responsibles')
        .insert(toAdd.map((memberId) => ({ event_id: eventId, member_id: memberId })));
      if (added.error) throw toDbError(added.error);
    }
    if (toRemove.length > 0) {
      const removed = await this.db
        .from('event_responsibles')
        .delete()
        .eq('event_id', eventId)
        .in('member_id', toRemove);
      if (removed.error) throw new Error(removed.error.message);
    }
  }
}
