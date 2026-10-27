import type { ErrorRequestHandler, RequestHandler } from 'express';

export const noEncontrado: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado' });
};

// Express identifica el manejador de errores por sus 4 parámetros.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const manejarErrores: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
};
