import express, { Router, type Request } from 'express';
import { HttpError } from '../../errors.js';
import {
  createScheduleSchema,
  scheduleIdSchema,
  updateScheduleSchema,
  updateSettingsSchema,
} from './settings.schemas.js';
import { MAX_LOGO_BYTES, type SettingsService } from './settings.service.js';
import { LOGO_MIME_TYPES } from './settings.types.js';

export type SettingsServiceFactory = (accessToken: string) => SettingsService;

function tokenOf(req: Request): string {
  if (!req.accessToken) {
    throw new HttpError(401, 'Falta el token de autenticación');
  }
  return req.accessToken;
}

// Imagen en el cuerpo (sin multipart, así no hace falta otra dependencia).
const logoBody = express.raw({ type: [...LOGO_MIME_TYPES], limit: MAX_LOGO_BYTES });

// Se monta detrás de authenticate y requireRole('admin'): toda la configuración es solo del administrador.
export function createSettingsRouter(settingsFor: SettingsServiceFactory): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json({ settings: await settingsFor(tokenOf(req)).get() });
  });

  router.patch('/', async (req, res) => {
    const patch = updateSettingsSchema.parse(req.body);
    res.json({ settings: await settingsFor(tokenOf(req)).update(patch) });
  });

  router.put('/logo', logoBody, async (req, res) => {
    const contentType = req.headers['content-type']?.split(';')[0]?.trim() ?? '';
    res.json({ settings: await settingsFor(tokenOf(req)).setLogo(contentType, req.body) });
  });

  router.delete('/logo', async (req, res) => {
    res.json({ settings: await settingsFor(tokenOf(req)).removeLogo() });
  });

  router.post('/schedules', async (req, res) => {
    const input = createScheduleSchema.parse(req.body);
    const schedule = await settingsFor(tokenOf(req)).createSchedule(input);
    res.status(201).json({ schedule });
  });

  router.patch('/schedules/:id', async (req, res) => {
    const id = scheduleIdSchema.parse(req.params.id);
    const patch = updateScheduleSchema.parse(req.body);
    res.json({ schedule: await settingsFor(tokenOf(req)).updateSchedule(id, patch) });
  });

  router.delete('/schedules/:id', async (req, res) => {
    const id = scheduleIdSchema.parse(req.params.id);
    await settingsFor(tokenOf(req)).deleteSchedule(id);
    res.status(204).end();
  });

  return router;
}
