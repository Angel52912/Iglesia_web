import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ROLES } from '../src/types/auth.js';
import { ROLE_IDS, authHeader, buildTestApp } from './helpers.js';

describe('GET /api/auth/me', () => {
  it('responde 401 sin token', async () => {
    const { app } = buildTestApp();
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('responde 401 con un token que no es Bearer', async () => {
    const { app } = buildTestApp();
    const response = await request(app).get('/api/auth/me').set('Authorization', 'token-admin');
    expect(response.status).toBe(401);
  });

  it('responde 401 con un token inválido', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-falso');
    expect(response.status).toBe(401);
  });

  it.each(ROLES)('devuelve el usuario y su rol para %s', async (role) => {
    const { app } = buildTestApp();
    const response = await request(app).get('/api/auth/me').set(authHeader(role));
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ user: { id: ROLE_IDS[role], role } });
  });

  it('responde 403 si el perfil está desactivado', async () => {
    const { app, store } = buildTestApp();
    const pastor = store.profiles.get(ROLE_IDS.pastor);
    if (!pastor) throw new Error('Falta el perfil de prueba');
    store.profiles.set(pastor.id, { ...pastor, active: false });

    const response = await request(app).get('/api/auth/me').set(authHeader('pastor'));
    expect(response.status).toBe(403);
  });

  it('toma el rol del perfil en cada petición, no del token', async () => {
    const { app } = buildTestApp();
    // El mismo token de secretaria pasa a ser tesorera sin volver a iniciar sesión.
    const before = await request(app).get('/api/auth/me').set(authHeader('secretary'));
    expect(before.body).toMatchObject({ user: { role: 'secretary' } });

    await request(app)
      .patch(`/api/users/${ROLE_IDS.secretary}`)
      .set(authHeader('admin'))
      .send({ role: 'treasurer' });

    const after = await request(app).get('/api/auth/me').set(authHeader('secretary'));
    expect(after.body).toMatchObject({ user: { role: 'treasurer' } });
  });

  it('bloquea de inmediato a un usuario desactivado aunque su token siga vigente', async () => {
    const { app } = buildTestApp();
    const before = await request(app).get('/api/auth/me').set(authHeader('treasurer'));
    expect(before.status).toBe(200);

    await request(app)
      .patch(`/api/users/${ROLE_IDS.treasurer}`)
      .set(authHeader('admin'))
      .send({ active: false });

    const after = await request(app).get('/api/auth/me').set(authHeader('treasurer'));
    expect(after.status).toBe(403);
  });
});
