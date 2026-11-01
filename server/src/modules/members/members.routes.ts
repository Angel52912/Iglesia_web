import { Router, type Request } from 'express';
import { HttpError } from '../../errors.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  createMemberSchema,
  listMembersQuerySchema,
  memberIdSchema,
  updateMemberSchema,
} from './members.schemas.js';
import type { MembersService } from './members.service.js';

export type MembersServiceFactory = (accessToken: string) => MembersService;

function tokenOf(req: Request): string {
  if (!req.accessToken) {
    throw new HttpError(401, 'Falta el token de autenticación');
  }
  return req.accessToken;
}

// Se monta detrás de authenticate. Lectura: admin, pastor, secretario. Escritura: admin, secretario.
export function createMembersRouter(membersFor: MembersServiceFactory): Router {
  const router = Router();
  const canWrite = requireRole('admin', 'secretary');

  router.get('/', requireRole('admin', 'pastor', 'secretary'), async (req, res) => {
    const filters = listMembersQuerySchema.parse(req.query);
    res.json({ members: await membersFor(tokenOf(req)).list(filters) });
  });

  router.post('/', canWrite, async (req, res) => {
    const input = createMemberSchema.parse(req.body);
    const member = await membersFor(tokenOf(req)).create(input);
    res.status(201).json({ member });
  });

  router.patch('/:id', canWrite, async (req, res) => {
    const id = memberIdSchema.parse(req.params.id);
    const patch = updateMemberSchema.parse(req.body);
    const member = await membersFor(tokenOf(req)).update(id, patch);
    res.json({ member });
  });

  return router;
}
