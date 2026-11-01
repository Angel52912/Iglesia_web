import { HttpError } from '../../errors.js';
import {
  LOGO_MIME_TYPES,
  type ChurchSettings,
  type LogoMimeType,
  type MeetingSchedule,
  type ScheduleInput,
  type SettingsRepository,
  type UpdateScheduleInput,
  type UpdateSettingsInput,
} from './settings.types.js';

export const MAX_LOGO_BYTES = 1024 * 1024;

function isLogoMimeType(value: string): value is LogoMimeType {
  return (LOGO_MIME_TYPES as readonly string[]).includes(value);
}

export class SettingsService {
  constructor(private readonly settings: SettingsRepository) {}

  get(): Promise<ChurchSettings> {
    return this.settings.get();
  }

  update(patch: UpdateSettingsInput): Promise<ChurchSettings> {
    return this.settings.update(patch);
  }

  async setLogo(contentType: string, data: unknown): Promise<ChurchSettings> {
    if (!isLogoMimeType(contentType)) {
      throw new HttpError(415, 'El logotipo debe ser una imagen PNG, JPEG o WebP');
    }
    if (!Buffer.isBuffer(data) || data.length === 0) {
      throw new HttpError(400, 'Falta el archivo del logotipo');
    }
    if (data.length > MAX_LOGO_BYTES) {
      throw new HttpError(413, 'El logotipo no puede pesar más de 1 MB');
    }
    return this.settings.setLogo({ contentType, data });
  }

  removeLogo(): Promise<ChurchSettings> {
    return this.settings.removeLogo();
  }

  createSchedule(input: ScheduleInput): Promise<MeetingSchedule> {
    return this.settings.createSchedule(input);
  }

  async updateSchedule(id: string, patch: UpdateScheduleInput): Promise<MeetingSchedule> {
    const updated = await this.settings.updateSchedule(id, patch);
    if (!updated) {
      throw new HttpError(404, 'Horario no encontrado');
    }
    return updated;
  }

  async deleteSchedule(id: string): Promise<void> {
    if (!(await this.settings.deleteSchedule(id))) {
      throw new HttpError(404, 'Horario no encontrado');
    }
  }
}
