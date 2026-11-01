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

// Firma real del archivo: el Content-Type lo declara el cliente y no es de fiar.
function detectImageType(data: Buffer): LogoMimeType | null {
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    return 'image/png';
  }
  if (data.length >= 3 && data.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) {
    return 'image/jpeg';
  }
  const isWebp =
    data.length >= 12 &&
    data.toString('latin1', 0, 4) === 'RIFF' &&
    data.toString('latin1', 8, 12) === 'WEBP';
  return isWebp ? 'image/webp' : null;
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
    if (detectImageType(data) !== contentType) {
      throw new HttpError(415, 'El archivo no es una imagen PNG, JPEG o WebP válida');
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
