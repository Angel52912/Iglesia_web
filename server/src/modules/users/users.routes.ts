import { Router, type Request } from 'express';
import { HttpError } from '../../errors.js';
import type { AuthenticatedUser } from '../../types/auth.js';
import { createUserSchema, updateUserSchema, userIdSchema } from './users.schemas.js';
import type { UsersService } from './users.service.js';

export type UsersServiceFactory = (accessToken: string) => UsersService;

function sessionOf(req: Request): { actor: AuthenticatedUser; accessToken: string } {
  if (!req.user || !req.accessToken) {
    throw new HttpError(401, 'Falta el token de autenticación');
  }
  return { actor: req.user, accessToken: req.accessToken };
}

// Se monta detrás de authenticate + requireRole('admin').
export function createUsersRouter(usersFor: UsersServiceFactory): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { accessToken } = sessionOf(req);
    res.json({ users: await usersFor(accessToken).list() });
  });

  router.post('/', async (req, res) => {
    const { accessToken } = sessionOf(req);
    const input = createUserSchema.parse(req.body);
    const user = await usersFor(accessToken).create(input);
    // La respuesta nunca incluye la contraseña.
    res.status(201).json({ user });
  });

  router.patch('/:id', async (req, res) => {
    const { actor, accessToken } = sessionOf(req);
    const id = userIdSchema.parse(req.params.id);
    const patch = updateUserSchema.parse(req.body);
    const user = await usersFor(accessToken).update(actor, id, patch);
    res.json({ user });
  });

  return router;
}
