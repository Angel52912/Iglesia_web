import { z } from 'zod';

const esquemaEnv = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_ORIGIN: z.url().default('http://localhost:5173'),
});

export type Env = z.infer<typeof esquemaEnv>;

export function cargarEnv(origen: NodeJS.ProcessEnv = process.env): Env {
  return esquemaEnv.parse(origen);
}
