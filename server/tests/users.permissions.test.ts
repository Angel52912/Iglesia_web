import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ROLES, type AppRole } from '../src/types/auth.js';
import { ROLE_IDS, authHeader, buildTestApp } from './helpers.js';

const NON_ADMIN_ROLES: AppRole[] = ROLES.filter((role) => role !== 'admin');

const newUser = {
  email: 'nuevo@iglesia.test',
  password: 'ClaveSegura123',
  fullName: 'Nuevo Usuario',
  role: 'secretary',
};

describe('permisos de /api/users (solo administrador)', () => {
  it('responde 401 sin token en cada endpoint', async () => {
    const { app } = buildTestApp();
    expect((await request(app).get('/api/users')).status).toBe(401);
    expect((await request(app).post('/api/users').send(newUser)).status).toBe(401);
    expect(
      (await request(app).patch(`/api/users/${ROLE_IDS.pastor}`).send({ fullName: 'X' })).status,
    ).toBe(401);
  });

  describe.each(NON_ADMIN_ROLES)('rol %s', (role) => {
    it('recibe 403 al listar usuarios', async () => {
      const { app } = buildTestApp();
      const response = await request(app).get('/api/users').set(authHeader(role));
      expect(response.status).toBe(403);
    });

    it('recibe 403 al crear usuarios y no se crea nada', async () => {
      const { app, store } = buildTestApp();
      const before = store.profiles.size;
      const response = await request(app).post('/api/users').set(authHeader(role)).send(newUser);
      expect(response.status).toBe(403);
      expect(store.profiles.size).toBe(before);
      expect(store.createCalls).toHaveLength(0);
    });

    it('recibe 403 al editar usuarios y no cambia nada', async () => {
      const { app, store } = buildTestApp();
      const response = await request(app)
        .patch(`/api/users/${ROLE_IDS.pastor}`)
        .set(authHeader(role))
        .send({ role: 'admin' });
      expect(response.status).toBe(403);
      expect(store.profiles.get(ROLE_IDS.pastor)?.role).toBe('pastor');
    });
  });

  it('el administrador puede listar, crear y editar', async () => {
    const { app } = buildTestApp();
    const list = await request(app).get('/api/users').set(authHeader('admin'));
    expect(list.status).toBe(200);
    expect(list.body).toHaveProperty('users');

    const create = await request(app).post('/api/users').set(authHeader('admin')).send(newUser);
    expect(create.status).toBe(201);

    const update = await request(app)
      .patch(`/api/users/${ROLE_IDS.pastor}`)
      .set(authHeader('admin'))
      .send({ fullName: 'Pastor Editado' });
    expect(update.status).toBe(200);
  });
});
