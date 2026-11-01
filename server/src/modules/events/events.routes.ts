import { Router, type Request } from 'express';
import { HttpError } from '../../errors.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  createEventSchema,
  eventIdSchema,
  listEventsQuerySchema,
  updateEventSchema,
} from './events.schemas.js';
import type { EventsService } from './events.service.js';

export type EventsServiceFactory = (accessToken: string) => EventsService;

function tokenOf(req: Request): string {
  if (!req.accessToken) {
    throw new HttpError(401, 'Falta el token de autenticación');
  }
  return req.accessToken;
}

// Se monta detrás de authenticate. Lectura: admin, pastor, secretario, tesorero.
// Escritura: admin, pastor, secretario. El coordinador (los de su ministerio) llega con coordinator_policies.
export function createEventsRouter(eventsFor: EventsServiceFactory): Router {
  const router = Router();
  const canWrite = requireRole('admin', 'pastor', 'secretary');

  router.get('/', requireRole('admin', 'pastor', 'secretary', 'treasurer'), async (req, res) => {
    const filters = listEventsQuerySchema.parse(req.query);
    res.json({ events: await eventsFor(tokenOf(req)).list(filters) });
  });

  router.post('/', canWrite, async (req, res) => {
    const input = createEventSchema.parse(req.body);
    const event = await eventsFor(tokenOf(req)).create(input);
    res.status(201).json({ event });
  });

  router.patch('/:id', canWrite, async (req, res) => {
    const id = eventIdSchema.parse(req.params.id);
    const patch = updateEventSchema.parse(req.body);
    res.json({ event: await eventsFor(tokenOf(req)).update(id, patch) });
  });

  return router;
}
