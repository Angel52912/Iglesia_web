import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { ReminderEvent, RemindersRepository } from './reminders.types.js';

const COLUMNS =
  'id,title,event_date,start_time,location,status,event_responsibles(members(full_name,email))';

const rowSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  event_date: z.string(),
  start_time: z.string(),
  location: z.string().nullable(),
  status: z.enum(['scheduled', 'cancelled']),
  event_responsibles: z
    .object({
      members: z.object({ full_name: z.string(), email: z.string().nullable() }).nullable(),
    })
    .array(),
});

export class SupabaseRemindersRepository implements RemindersRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findEvent(eventId: string): Promise<ReminderEvent | null> {
    const { data, error } = await this.db
      .from('events')
      .select(COLUMNS)
      .eq('id', eventId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = rowSchema.parse(data);
    return {
      id: row.id,
      title: row.title,
      eventDate: row.event_date,
      startTime: row.start_time.slice(0, 5),
      location: row.location,
      status: row.status,
      responsibles: row.event_responsibles.flatMap((link) =>
        link.members ? [{ fullName: link.members.full_name, email: link.members.email }] : [],
      ),
    };
  }
}
