import { apiRequest } from '../../lib/apiClient';

export interface MeetingSchedule {
  id: string;
  label: string;
  weekday: number;
  startTime: string;
}

export interface ChurchSettings {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  schedules: MeetingSchedule[];
}

export interface SettingsPayload {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface SchedulePayload {
  label: string;
  weekday: number;
  startTime: string;
}

export async function getSettings(): Promise<ChurchSettings> {
  const { settings } = await apiRequest<{ settings: ChurchSettings }>('/api/settings');
  return settings;
}

export async function updateSettings(payload: SettingsPayload): Promise<ChurchSettings> {
  const { settings } = await apiRequest<{ settings: ChurchSettings }>('/api/settings', {
    method: 'PATCH',
    body: payload,
  });
  return settings;
}

export async function uploadLogo(file: File): Promise<ChurchSettings> {
  const { settings } = await apiRequest<{ settings: ChurchSettings }>('/api/settings/logo', {
    method: 'PUT',
    file,
  });
  return settings;
}

export async function removeLogo(): Promise<ChurchSettings> {
  const { settings } = await apiRequest<{ settings: ChurchSettings }>('/api/settings/logo', {
    method: 'DELETE',
  });
  return settings;
}

export async function createSchedule(payload: SchedulePayload): Promise<MeetingSchedule> {
  const { schedule } = await apiRequest<{ schedule: MeetingSchedule }>('/api/settings/schedules', {
    method: 'POST',
    body: payload,
  });
  return schedule;
}

export async function deleteSchedule(id: string): Promise<void> {
  await apiRequest<null>(`/api/settings/schedules/${id}`, { method: 'DELETE' });
}
