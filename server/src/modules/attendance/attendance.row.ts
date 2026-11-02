import { z } from 'zod';
import { EVENT_CATEGORIES, EVENT_STATUSES } from '../events/events.types.js';

export const EVENT_REF_COLUMNS = 'id,title,event_date,category,status';

export const eventRefRowSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  event_date: z.string(),
  category: z.enum(EVENT_CATEGORIES),
  status: z.enum(EVENT_STATUSES),
});

export const recordRowSchema = z.object({
  member_id: z.uuid(),
  present: z.boolean(),
  members: z.object({ full_name: z.string() }).nullable(),
});

export const summaryRowSchema = z.object({
  present: z.boolean(),
  events: z.object({
    id: z.uuid(),
    title: z.string(),
    event_date: z.string(),
    category: z.enum(EVENT_CATEGORIES),
  }),
});

export type SummaryRow = z.infer<typeof summaryRowSchema>;
