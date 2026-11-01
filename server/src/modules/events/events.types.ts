export const EVENT_TYPES = ['religious', 'administrative'] as const;
export const EVENT_CATEGORIES = ['worship', 'meeting', 'activity'] as const;
export const EVENT_STATUSES = ['scheduled', 'cancelled'] as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type EventCategory = (typeof EVENT_CATEGORIES)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];

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
  from?: string | undefined;
  to?: string | undefined;
  status?: EventStatus | undefined;
  ministryId?: string | undefined;
}

export interface CreateEventInput {
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string;
  location: string | null;
  type: EventType;
  category: EventCategory;
  ministryId: string | null;
  responsibleIds: string[];
}

export interface UpdateEventInput {
  title?: string | undefined;
  description?: string | null | undefined;
  eventDate?: string | undefined;
  startTime?: string | undefined;
  location?: string | null | undefined;
  type?: EventType | undefined;
  category?: EventCategory | undefined;
  status?: EventStatus | undefined;
  ministryId?: string | null | undefined;
  responsibleIds?: string[] | undefined;
}

// Acceso a events y event_responsibles con el JWT del usuario (RLS aplica).
export interface EventsRepository {
  list(filters: EventFilters): Promise<ChurchEvent[]>;
  create(input: CreateEventInput): Promise<ChurchEvent>;
  update(id: string, patch: UpdateEventInput): Promise<ChurchEvent | null>;
}
