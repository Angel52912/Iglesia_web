import type { RequestHandler } from 'express';
import { HttpError } from '../errors.js';
import type { AppRole } from '../types/auth.js';

export function requireRole(...allowed: AppRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      throw new HttpError(401, 'Falta el token de autenticación');
    }
    if (!allowed.includes(req.user.role)) {
      throw new HttpError(403, 'No tienes permiso para realizar esta acción');
    }
    next();
  };
}
