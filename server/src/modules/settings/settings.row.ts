import { z } from 'zod';

export const SETTINGS_COLUMNS = 'name,address,phone,email,logo_path';
export const SCHEDULE_COLUMNS = 'id,label,weekday,start_time';

export const settingsRowSchema = z.object({
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  logo_path: z.string().nullable(),
});

export const scheduleRowSchema = z.object({
  id: z.uuid(),
  label: z.string(),
  weekday: z.number(),
  start_time: z.string(),
});

export type SettingsRow = z.infer<typeof settingsRowSchema>;
export type ScheduleRow = z.infer<typeof scheduleRowSchema>;
