import { apiRequest } from '../../lib/apiClient';

export type EventType = 'religious' | 'administrative';
export type EventCategory = 'worship' | 'meeting' | 'activity';
export type EventStatus = 'scheduled' | 'cancelled';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  religious: 'Religioso',
  administrative: 'Administrativo',
};

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  worship: 'Culto',
  meeting: 'Reunión',
  activity: 'Actividad',
};

export interface Responsible {
  id: string;
  fullName: string;
}

export interface ChurchEvent {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string;
  location: string | null;
  type: EventType;
  category: EventCategory;
  status: EventStatus;
  ministryId: string | null;
  ministryName: string | null;
  responsibles: Responsible[];
}

export interface EventFilters {
  from?: string;
  to?: string;
  status?: EventStatus;
  ministryId?: string;
}

export interface EventPayload {
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  location: string;
  type: EventType;
  category: EventCategory;
  ministryId: string | null;
  responsibleIds: string[];
}

export async function listEvents(filters: EventFilters): Promise<ChurchEvent[]> {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.status) params.set('status', filters.status);
  if (filters.ministryId) params.set('ministryId', filters.ministryId);
  const query = params.toString();
  const { events } = await apiRequest<{ events: ChurchEvent[] }>(
    `/api/events${query ? `?${query}` : ''}`,
  );
  return events;
}

export async function createEvent(payload: EventPayload): Promise<ChurchEvent> {
  const { event } = await apiRequest<{ event: ChurchEvent }>('/api/events', {
    method: 'POST',
    body: payload,
  });
  return event;
}

export interface ReminderResult {
  sent: number;
  withoutEmail: number;
  failed: number;
}

export function sendEventReminder(id: string): Promise<ReminderResult> {
  return apiRequest<ReminderResult>(`/api/reminders/events/${id}`, { method: 'POST' });
}

export async function updateEvent(
  id: string,
  payload: Partial<EventPayload> & { status?: EventStatus },
): Promise<ChurchEvent> {
  const { event } = await apiRequest<{ event: ChurchEvent }>(`/api/events/${id}`, {
    method: 'PATCH',
    body: payload,
  });
  return event;
}
