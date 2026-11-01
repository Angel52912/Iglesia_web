import type { RequestHandler } from 'express';
import { HttpError } from '../errors.js';
import type { Authenticator } from '../types/auth.js';

export function createAuthenticate(authenticator: Authenticator): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
      throw new HttpError(401, 'Falta el token de autenticación');
    }

    const result = await authenticator.authenticate(token);
    if (result.status === 'invalid') {
      throw new HttpError(401, 'Sesión no válida o expirada');
    }
    if (result.status === 'inactive') {
      throw new HttpError(403, 'Tu cuenta está desactivada');
    }

    req.user = result.user;
    req.accessToken = token;
    next();
  };
}
