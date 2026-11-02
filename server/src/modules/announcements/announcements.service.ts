import { HttpError } from '../../errors.js';
import type {
  Announcement,
  AnnouncementFilters,
  AnnouncementsRepository,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from './announcements.types.js';

export class AnnouncementsService {
  constructor(private readonly announcements: AnnouncementsRepository) {}

  list(filters: AnnouncementFilters): Promise<Announcement[]> {
    return this.announcements.list(filters);
  }

  create(input: CreateAnnouncementInput): Promise<Announcement> {
    return this.announcements.create(input);
  }

  async update(id: string, patch: UpdateAnnouncementInput): Promise<Announcement> {
    const updated = await this.announcements.update(id, patch);
    if (!updated) throw new HttpError(404, 'Comunicado no encontrado');
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!(await this.announcements.remove(id))) {
      throw new HttpError(404, 'Comunicado no encontrado');
    }
  }
}
