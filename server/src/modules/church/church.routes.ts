import { Router } from 'express';
import { HttpError } from '../../errors.js';
import type { ChurchRepository } from './church.types.js';

export type ChurchRepositoryFactory = (accessToken: string) => ChurchRepository;

// Se monta detrás de authenticate: cualquier rol activo ve nombre, logotipo, dirección y correo.
export function createChurchRouter(churchFor: ChurchRepositoryFactory): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    if (!req.accessToken) {
      throw new HttpError(401, 'Falta el token de autenticación');
    }
    res.json({ church: await churchFor(req.accessToken).getPublicInfo() });
  });

  return router;
}
