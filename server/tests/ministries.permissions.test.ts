import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { AppRole } from '../src/types/auth.js';
import { authHeader, buildTestApp } from './helpers.js';

const CAN_READ: AppRole[] = ['admin', 'pastor', 'secretary'];
const CAN_WRITE: AppRole[] = ['admin', 'pastor'];
const CANNOT_READ: AppRole[] = ['treasurer', 'coordinator'];
const CANNOT_WRITE: AppRole[] = ['secretary', 'treasurer', 'coordinator'];

const ID = '00000000-0000-4000-8000-0000000000ff';

describe('permisos de /api/ministries', () => {
  it('responde 401 sin token en cada endpoint', async () => {
    const { app } = buildTestApp();
    expect((await request(app).get('/api/ministries')).status).toBe(401);
    expect((await request(app).get(`/api/ministries/${ID}`)).status).toBe(401);
    expect((await request(app).post('/api/ministries').send({ name: 'X' })).status).toBe(401);
    expect((await request(app).patch(`/api/ministries/${ID}`).send({})).status).toBe(401);
    expect((await request(app).put(`/api/ministries/${ID}/coordinators`).send({})).status).toBe(
      401,
    );
    expect((await request(app).put(`/api/ministries/${ID}/members`).send({})).status).toBe(401);
  });

  it.each(CAN_READ)('%s puede consultar la lista y el detalle', async (role) => {
    const { app } = buildTestApp();
    const created = await request(app)
      .post('/api/ministries')
      .set(authHeader('admin'))
      .send({ name: 'Música' });
    const { id } = (created.body as { ministry: { id: string } }).ministry;
    expect((await request(app).get('/api/ministries').set(authHeader(role))).status).toBe(200);
    expect((await request(app).get(`/api/ministries/${id}`).set(authHeader(role))).status).toBe(
      200,
    );
  });

  it.each(CANNOT_READ)('%s recibe 403 al consultar', async (role) => {
    const { app } = buildTestApp();
    expect((await request(app).get('/api/ministries').set(authHeader(role))).status).toBe(403);
    expect((await request(app).get(`/api/ministries/${ID}`).set(authHeader(role))).status).toBe(
      403,
    );
  });

  it.each(CAN_WRITE)('%s puede registrar, editar y vincular', async (role) => {
    const { app } = buildTestApp();
    const headers = authHeader(role);
    const created = await request(app)
      .post('/api/ministries')
      .set(headers)
      .send({ name: 'Música' });
    expect(created.status).toBe(201);
    const { id } = (created.body as { ministry: { id: string } }).ministry;
    const patch = await request(app)
      .patch(`/api/ministries/${id}`)
      .set(headers)
      .send({ active: false });
    expect(patch.status).toBe(200);
    const coordinators = await request(app)
      .put(`/api/ministries/${id}/coordinators`)
      .set(headers)
      .send({ memberIds: [] });
    expect(coordinators.status).toBe(200);
    const members = await request(app)
      .put(`/api/ministries/${id}/members`)
      .set(headers)
      .send({ memberIds: [] });
    expect(members.status).toBe(200);
  });

  describe.each(CANNOT_WRITE)('rol %s', (role) => {
    it('recibe 403 al escribir y no se crea ni cambia nada', async () => {
      const { app, store } = buildTestApp();
      const headers = authHeader(role);
      const created = await request(app).post('/api/ministries').set(headers).send({ name: 'X' });
      expect(created.status).toBe(403);
      expect(store.ministries.size).toBe(0);

      const seeded = await request(app)
        .post('/api/ministries')
        .set(authHeader('admin'))
        .send({ name: 'Música' });
      const { id } = (seeded.body as { ministry: { id: string } }).ministry;
      const patch = await request(app)
        .patch(`/api/ministries/${id}`)
        .set(headers)
        .send({ active: false });
      expect(patch.status).toBe(403);
      const coordinators = await request(app)
        .put(`/api/ministries/${id}/coordinators`)
        .set(headers)
        .send({ memberIds: [] });
      expect(coordinators.status).toBe(403);
      const members = await request(app)
        .put(`/api/ministries/${id}/members`)
        .set(headers)
        .send({ memberIds: [] });
      expect(members.status).toBe(403);
      expect(store.ministries.get(id)?.active).toBe(true);
    });
  });
});
