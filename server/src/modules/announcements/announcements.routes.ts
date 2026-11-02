import { Router, type Request } from 'express';
import { HttpError } from '../../errors.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  announcementIdSchema,
  createAnnouncementSchema,
  listAnnouncementsQuerySchema,
  updateAnnouncementSchema,
} from './announcements.schemas.js';
import type { AnnouncementsService } from './announcements.service.js';

export type AnnouncementsServiceFactory = (accessToken: string) => AnnouncementsService;

function tokenOf(req: Request): string {
  if (!req.accessToken) {
    throw new HttpError(401, 'Falta el token de autenticación');
  }
  return req.accessToken;
}

// Se monta detrás de authenticate. Lectura: admin, pastor, secretario, coordinador.
// Escritura: admin, pastor, secretario. El tesorero no tiene acceso.
export function createAnnouncementsRouter(announcementsFor: AnnouncementsServiceFactory): Router {
  const router = Router();
  const canWrite = requireRole('admin', 'pastor', 'secretary');

  router.get('/', requireRole('admin', 'pastor', 'secretary', 'coordinator'), async (req, res) => {
    const filters = listAnnouncementsQuerySchema.parse(req.query);
    res.json({ announcements: await announcementsFor(tokenOf(req)).list(filters) });
  });

  router.post('/', canWrite, async (req, res) => {
    const input = createAnnouncementSchema.parse(req.body);
    const announcement = await announcementsFor(tokenOf(req)).create(input);
    res.status(201).json({ announcement });
  });

  router.patch('/:id', canWrite, async (req, res) => {
    const id = announcementIdSchema.parse(req.params.id);
    const patch = updateAnnouncementSchema.parse(req.body);
    res.json({ announcement: await announcementsFor(tokenOf(req)).update(id, patch) });
  });

  router.delete('/:id', canWrite, async (req, res) => {
    const id = announcementIdSchema.parse(req.params.id);
    await announcementsFor(tokenOf(req)).remove(id);
    res.status(204).end();
  });

  return router;
}
