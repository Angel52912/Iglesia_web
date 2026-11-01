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

export interface UpdateSettingsInput {
  name?: string | undefined;
  address?: string | null | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
}

export interface ScheduleInput {
  label: string;
  weekday: number;
  startTime: string;
}

export interface UpdateScheduleInput {
  label?: string | undefined;
  weekday?: number | undefined;
  startTime?: string | undefined;
}

export const LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type LogoMimeType = (typeof LOGO_MIME_TYPES)[number];

export interface LogoFile {
  contentType: LogoMimeType;
  data: Buffer;
}

// Acceso a church_settings, meeting_schedules y al bucket church-assets con el JWT del usuario (RLS aplica).
export interface SettingsRepository {
  get(): Promise<ChurchSettings>;
  update(patch: UpdateSettingsInput): Promise<ChurchSettings>;
  // Sube el archivo, guarda la ruta y borra el logotipo anterior.
  setLogo(file: LogoFile): Promise<ChurchSettings>;
  removeLogo(): Promise<ChurchSettings>;
  createSchedule(input: ScheduleInput): Promise<MeetingSchedule>;
  updateSchedule(id: string, patch: UpdateScheduleInput): Promise<MeetingSchedule | null>;
  deleteSchedule(id: string): Promise<boolean>;
}
