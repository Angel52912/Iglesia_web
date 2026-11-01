import { z } from 'zod';
import { EVENT_CATEGORIES, EVENT_STATUSES, EVENT_TYPES } from './events.types.js';

// Responsables y ministerio llegan anidados; RLS puede ocultarlos (p. ej. al tesorero), por eso son nullable.
export const EVENT_COLUMNS =
  'id,title,description,event_date,start_time,location,type,category,status,ministry_id,ministries(name),event_responsibles(members(id,full_name))';

export const eventRowSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  event_date: z.string(),
  start_time: z.string(),
  location: z.string().nullable(),
  type: z.enum(EVENT_TYPES),
  category: z.enum(EVENT_CATEGORIES),
  status: z.enum(EVENT_STATUSES),
  ministry_id: z.uuid().nullable(),
  ministries: z.object({ name: z.string() }).nullable(),
  event_responsibles: z
    .object({ members: z.object({ id: z.uuid(), full_name: z.string() }).nullable() })
    .array(),
});

export const insertedEventSchema = z.object({ id: z.uuid() });

export type EventRow = z.infer<typeof eventRowSchema>;
