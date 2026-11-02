import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../errors.js';
import { requireRole } from '../../middleware/requireRole.js';
import type { RemindersService } from './reminders.service.js';

export type RemindersServiceFactory = (accessToken: string) => RemindersService;

const eventIdSchema = z.uuid();

// Se monta detrás de authenticate. Mismos roles que escriben eventos: admin, pastor, secretario.
export function createRemindersRouter(remindersFor: RemindersServiceFactory): Router {
  const router = Router();

  router.post(
    '/events/:id',
    requireRole('admin', 'pastor', 'secretary'),
    async (req, res) => {
      if (!req.accessToken) {
        throw new HttpError(401, 'Falta el token de autenticación');
      }
      const id = eventIdSchema.parse(req.params.id);
      res.json(await remindersFor(req.accessToken).remindResponsibles(id));
    },
  );

  return router;
}
