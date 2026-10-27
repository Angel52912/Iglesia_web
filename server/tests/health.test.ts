import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';

const app = crearApp({ CLIENT_ORIGIN: 'http://localhost:5173' });

describe('GET /api/health', () => {
  it('responde 200 con status ok', async () => {
    const respuesta = await request(app).get('/api/health');
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ status: 'ok' });
  });

  it('responde 404 en rutas desconocidas', async () => {
    const respuesta = await request(app).get('/api/no-existe');
    expect(respuesta.status).toBe(404);
  });
});
