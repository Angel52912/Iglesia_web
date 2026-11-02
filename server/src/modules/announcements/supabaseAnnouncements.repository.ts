import type { SupabaseClient } from '@supabase/supabase-js';
import { toDbError } from '../shared/dbError.js';
import {
  ANNOUNCEMENT_COLUMNS,
  announcementRowSchema,
  type AnnouncementRow,
} from './announcement.row.js';
import type {
  Announcement,
  AnnouncementFilters,
  AnnouncementsRepository,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from './announcements.types.js';

function toAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    important: row.important,
    publishedOn: row.published_on,
  };
}

export class SupabaseAnnouncementsRepository implements AnnouncementsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(filters: AnnouncementFilters): Promise<Announcement[]> {
    let query = this.db
      .from('announcements')
      .select(ANNOUNCEMENT_COLUMNS)
      .order('published_on', { ascending: false })
      .order('created_at', { ascending: false });
    if (filters.important !== undefined) query = query.eq('important', filters.important);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return announcementRowSchema.array().parse(data).map(toAnnouncement);
  }

  async create(input: CreateAnnouncementInput): Promise<Announcement> {
    const row: Record<string, string | boolean> = {
      title: input.title,
      body: input.body,
      important: input.important,
    };
    if (input.publishedOn !== undefined) row.published_on = input.publishedOn;
    const { data, error } = await this.db
      .from('announcements')
      .insert(row)
      .select(ANNOUNCEMENT_COLUMNS)
      .single();
    if (error) throw toDbError(error);
    return toAnnouncement(announcementRowSchema.parse(data));
  }

  async update(id: string, patch: UpdateAnnouncementInput): Promise<Announcement | null> {
    const changes: Record<string, string | boolean> = {};
    if (patch.title !== undefined) changes.title = patch.title;
    if (patch.body !== undefined) changes.body = patch.body;
    if (patch.important !== undefined) changes.important = patch.important;
    if (patch.publishedOn !== undefined) changes.published_on = patch.publishedOn;
    const { data, error } = await this.db
      .from('announcements')
      .update(changes)
      .eq('id', id)
      .select(ANNOUNCEMENT_COLUMNS);
    if (error) throw toDbError(error);
    // Si RLS filtra el update no hay error: devuelve 0 filas.
    const rows = announcementRowSchema.array().parse(data);
    return rows[0] ? toAnnouncement(rows[0]) : null;
  }

  async remove(id: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('announcements')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw new Error(error.message);
    return Array.isArray(data) && data.length > 0;
  }
}
