import { apiRequest } from '../../lib/apiClient';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  important: boolean;
  publishedOn: string;
}

export interface AnnouncementPayload {
  title: string;
  body: string;
  important: boolean;
  publishedOn: string;
}

export async function listAnnouncements(): Promise<Announcement[]> {
  const { announcements } = await apiRequest<{ announcements: Announcement[] }>(
    '/api/announcements',
  );
  return announcements;
}

export async function createAnnouncement(payload: AnnouncementPayload): Promise<Announcement> {
  const { announcement } = await apiRequest<{ announcement: Announcement }>(
    '/api/announcements',
    { method: 'POST', body: payload },
  );
  return announcement;
}

export async function updateAnnouncement(
  id: string,
  payload: Partial<AnnouncementPayload>,
): Promise<Announcement> {
  const { announcement } = await apiRequest<{ announcement: Announcement }>(
    `/api/announcements/${id}`,
    { method: 'PATCH', body: payload },
  );
  return announcement;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await apiRequest<null>(`/api/announcements/${id}`, { method: 'DELETE' });
}
