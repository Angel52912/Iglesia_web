import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.js';

const { app } = buildTestApp();

describe('GET /api/health', () => {
  it('responde 200 con status ok sin autenticación', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('responde 404 en rutas desconocidas', async () => {
    const response = await request(app).get('/api/no-existe');
    expect(response.status).toBe(404);
  });
});
