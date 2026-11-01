import { HttpError } from '../../errors.js';

interface DbError {
  code?: string;
  message: string;
}

// Errores de restricción de Postgres que el usuario puede provocar: se devuelven como 4xx, no como 500.
export function toDbError(error: DbError, conflictMessage = 'Ya existe un registro igual'): Error {
  if (error.code === '23505') return new HttpError(409, conflictMessage);
  if (error.code === '23503') return new HttpError(400, 'Hay un dato relacionado que no existe');
  return new Error(error.message);
}
