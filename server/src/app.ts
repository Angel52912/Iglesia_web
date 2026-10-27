import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Env } from './config/env.js';
import { manejarErrores, noEncontrado } from './middleware/errorHandler.js';

export function crearApp(env: Pick<Env, 'CLIENT_ORIGIN'>): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(noEncontrado);
  app.use(manejarErrores);

  return app;
}
