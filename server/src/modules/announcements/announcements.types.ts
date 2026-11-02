export interface Announcement {
  id: string;
  title: string;
  body: string;
  important: boolean;
  publishedOn: string;
}

export interface AnnouncementFilters {
  important?: boolean | undefined;
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  important: boolean;
  // Sin fecha, la BD usa hoy.
  publishedOn?: string | undefined;
}

export interface UpdateAnnouncementInput {
  title?: string | undefined;
  body?: string | undefined;
  important?: boolean | undefined;
  publishedOn?: string | undefined;
}

// Acceso a announcements con el JWT del usuario (RLS aplica).
export interface AnnouncementsRepository {
  list(filters: AnnouncementFilters): Promise<Announcement[]>;
  create(input: CreateAnnouncementInput): Promise<Announcement>;
  update(id: string, patch: UpdateAnnouncementInput): Promise<Announcement | null>;
  remove(id: string): Promise<boolean>;
}
