import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SCHEDULE_COLUMNS,
  SETTINGS_COLUMNS,
  scheduleRowSchema,
  settingsRowSchema,
  type ScheduleRow,
  type SettingsRow,
} from './settings.row.js';
import type {
  ChurchSettings,
  LogoFile,
  MeetingSchedule,
  ScheduleInput,
  SettingsRepository,
  UpdateScheduleInput,
  UpdateSettingsInput,
} from './settings.types.js';

const BUCKET = 'church-assets';
const EXTENSIONS: Record<LogoFile['contentType'], string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function toSchedule(row: ScheduleRow): MeetingSchedule {
  return {
    id: row.id,
    label: row.label,
    weekday: row.weekday,
    // Postgres devuelve HH:MM:SS.
    startTime: row.start_time.slice(0, 5),
  };
}

export class SupabaseSettingsRepository implements SettingsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async get(): Promise<ChurchSettings> {
    const row = await this.readRow();
    return this.toSettings(row, await this.listSchedules());
  }

  async update(patch: UpdateSettingsInput): Promise<ChurchSettings> {
    const changes: Record<string, string | null> = {};
    if (patch.name !== undefined) changes.name = patch.name;
    if (patch.address !== undefined) changes.address = patch.address;
    if (patch.phone !== undefined) changes.phone = patch.phone;
    if (patch.email !== undefined) changes.email = patch.email;
    await this.writeRow(changes);
    return this.get();
  }

  async setLogo(file: LogoFile): Promise<ChurchSettings> {
    const previous = (await this.readRow()).logo_path;
    // Nombre nuevo en cada subida: evita que el navegador muestre un logotipo en caché.
    const path = `logo-${String(Date.now())}.${EXTENSIONS[file.contentType]}`;
    const upload = await this.db.storage
      .from(BUCKET)
      .upload(path, file.data, { contentType: file.contentType });
    if (upload.error) throw new Error(upload.error.message);

    try {
      await this.writeRow({ logo_path: path });
    } catch (error) {
      await this.db.storage.from(BUCKET).remove([path]);
      throw error;
    }
    if (previous) await this.db.storage.from(BUCKET).remove([previous]);
    return this.get();
  }

  async removeLogo(): Promise<ChurchSettings> {
    const previous = (await this.readRow()).logo_path;
    await this.writeRow({ logo_path: null });
    if (previous) await this.db.storage.from(BUCKET).remove([previous]);
    return this.get();
  }

  async createSchedule(input: ScheduleInput): Promise<MeetingSchedule> {
    const { data, error } = await this.db
      .from('meeting_schedules')
      .insert({ label: input.label, weekday: input.weekday, start_time: input.startTime })
      .select(SCHEDULE_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return toSchedule(scheduleRowSchema.parse(data));
  }

  async updateSchedule(id: string, patch: UpdateScheduleInput): Promise<MeetingSchedule | null> {
    const changes: Record<string, string | number> = {};
    if (patch.label !== undefined) changes.label = patch.label;
    if (patch.weekday !== undefined) changes.weekday = patch.weekday;
    if (patch.startTime !== undefined) changes.start_time = patch.startTime;

    const { data, error } = await this.db
      .from('meeting_schedules')
      .update(changes)
      .eq('id', id)
      .select(SCHEDULE_COLUMNS)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toSchedule(scheduleRowSchema.parse(data)) : null;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('meeting_schedules')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw new Error(error.message);
    return Array.isArray(data) && data.length > 0;
  }

  private async readRow(): Promise<SettingsRow> {
    const { data, error } = await this.db
      .from('church_settings')
      .select(SETTINGS_COLUMNS)
      .eq('id', 1)
      .single();
    if (error) throw new Error(error.message);
    return settingsRowSchema.parse(data);
  }

  private async writeRow(changes: Record<string, string | null>): Promise<void> {
    const { data, error } = await this.db
      .from('church_settings')
      .update(changes)
      .eq('id', 1)
      .select('id');
    if (error) throw new Error(error.message);
    // Si RLS filtra el update no hay error: devuelve 0 filas.
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No se pudo actualizar la configuración');
    }
  }

  private async listSchedules(): Promise<MeetingSchedule[]> {
    const { data, error } = await this.db
      .from('meeting_schedules')
      .select(SCHEDULE_COLUMNS)
      .order('weekday')
      .order('start_time');
    if (error) throw new Error(error.message);
    return scheduleRowSchema.array().parse(data).map(toSchedule);
  }

  private toSettings(row: SettingsRow, schedules: MeetingSchedule[]): ChurchSettings {
    const logoUrl = row.logo_path
      ? this.db.storage.from(BUCKET).getPublicUrl(row.logo_path).data.publicUrl
      : null;
    return {
      name: row.name,
      address: row.address,
      phone: row.phone,
      email: row.email,
      logoUrl,
      schedules,
    };
  }
}
