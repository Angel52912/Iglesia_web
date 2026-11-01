import { Router, type Request } from 'express';
import { HttpError } from '../../errors.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  createMinistrySchema,
  memberIdsSchema,
  ministryIdSchema,
  updateMinistrySchema,
} from './ministries.schemas.js';
import type { MinistriesService } from './ministries.service.js';

export type MinistriesServiceFactory = (accessToken: string) => MinistriesService;

function tokenOf(req: Request): string {
  if (!req.accessToken) {
    throw new HttpError(401, 'Falta el token de autenticación');
  }
  return req.accessToken;
}

// Se monta detrás de authenticate. Lectura: admin, pastor, secretario. Escritura: admin, pastor.
// El coordinador (gestionar el suyo) se habilita con la migración coordinator_policies.
export function createMinistriesRouter(ministriesFor: MinistriesServiceFactory): Router {
  const router = Router();
  const canRead = requireRole('admin', 'pastor', 'secretary');
  const canWrite = requireRole('admin', 'pastor');

  router.get('/', canRead, async (req, res) => {
    res.json({ ministries: await ministriesFor(tokenOf(req)).list() });
  });

  router.get('/:id', canRead, async (req, res) => {
    const id = ministryIdSchema.parse(req.params.id);
    res.json({ ministry: await ministriesFor(tokenOf(req)).get(id) });
  });

  router.post('/', canWrite, async (req, res) => {
    const input = createMinistrySchema.parse(req.body);
    const ministry = await ministriesFor(tokenOf(req)).create(input);
    res.status(201).json({ ministry });
  });

  router.patch('/:id', canWrite, async (req, res) => {
    const id = ministryIdSchema.parse(req.params.id);
    const patch = updateMinistrySchema.parse(req.body);
    res.json({ ministry: await ministriesFor(tokenOf(req)).update(id, patch) });
  });

  router.put('/:id/coordinators', canWrite, async (req, res) => {
    const id = ministryIdSchema.parse(req.params.id);
    const { memberIds } = memberIdsSchema.parse(req.body);
    res.json({ ministry: await ministriesFor(tokenOf(req)).setCoordinators(id, memberIds) });
  });

  router.put('/:id/members', canWrite, async (req, res) => {
    const id = ministryIdSchema.parse(req.params.id);
    const { memberIds } = memberIdsSchema.parse(req.body);
    res.json({ ministry: await ministriesFor(tokenOf(req)).setMembers(id, memberIds) });
  });

  return router;
}
