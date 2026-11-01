import { Router } from 'express';
import { HttpError } from '../../errors.js';

// Se monta detrás de authenticate: cualquier rol activo puede consultar su sesión.
export function createAuthRouter(): Router {
  const router = Router();

  router.get('/me', (req, res) => {
    if (!req.user) {
      throw new HttpError(401, 'Falta el token de autenticación');
    }
    res.json({ user: req.user });
  });

  return router;
}
