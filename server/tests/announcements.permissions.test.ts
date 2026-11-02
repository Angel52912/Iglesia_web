import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { AppRole } from '../src/types/auth.js';
import { authHeader, buildTestApp } from './helpers.js';

const CAN_READ: AppRole[] = ['admin', 'pastor', 'secretary', 'coordinator'];
const CAN_WRITE: AppRole[] = ['admin', 'pastor', 'secretary'];
const CANNOT_READ: AppRole[] = ['treasurer'];
const CANNOT_WRITE: AppRole[] = ['treasurer', 'coordinator'];

const ID = '00000000-0000-4000-8000-0000000000ff';
const newAnnouncement = { title: 'Retiro de jóvenes', body: 'Sábado a las 8:00 en el templo.' };

describe('permisos de /api/announcements', () => {
  it('responde 401 sin token en cada endpoint', async () => {
    const { app } = buildTestApp();
    expect((await request(app).get('/api/announcements')).status).toBe(401);
    expect((await request(app).post('/api/announcements').send(newAnnouncement)).status).toBe(401);
    expect((await request(app).patch(`/api/announcements/${ID}`).send({})).status).toBe(401);
    expect((await request(app).delete(`/api/announcements/${ID}`)).status).toBe(401);
  });

  it.each(CAN_READ)('%s puede consultar los comunicados', async (role) => {
    const { app } = buildTestApp();
    const response = await request(app).get('/api/announcements').set(authHeader(role));
    expect(response.status).toBe(200);
  });

  it.each(CANNOT_READ)('%s recibe 403 al consultar', async (role) => {
    const { app } = buildTestApp();
    const response = await request(app).get('/api/announcements').set(authHeader(role));
    expect(response.status).toBe(403);
  });

  it.each(CAN_WRITE)('%s puede publicar, editar y eliminar', async (role) => {
    const { app, store } = buildTestApp();
    const headers = authHeader(role);
    const created = await request(app).post('/api/announcements').set(headers).send(newAnnouncement);
    expect(created.status).toBe(201);
    const { id } = (created.body as { announcement: { id: string } }).announcement;
    const edited = await request(app)
      .patch(`/api/announcements/${id}`)
      .set(headers)
      .send({ title: 'Otro' });
    expect(edited.status).toBe(200);
    const removed = await request(app).delete(`/api/announcements/${id}`).set(headers);
    expect(removed.status).toBe(204);
    expect(store.announcements.size).toBe(0);
  });

  describe.each(CANNOT_WRITE)('rol %s', (role) => {
    it('recibe 403 al escribir y no se crea, cambia ni elimina nada', async () => {
      const { app, store } = buildTestApp();
      const headers = authHeader(role);
      const created = await request(app).post('/api/announcements').set(headers).send(newAnnouncement);
      expect(created.status).toBe(403);
      expect(store.announcements.size).toBe(0);

      const seeded = await request(app)
        .post('/api/announcements')
        .set(authHeader('admin'))
        .send(newAnnouncement);
      const { id } = (seeded.body as { announcement: { id: string } }).announcement;
      const patch = await request(app)
        .patch(`/api/announcements/${id}`)
        .set(headers)
        .send({ title: 'Cambiado' });
      expect(patch.status).toBe(403);
      const removed = await request(app).delete(`/api/announcements/${id}`).set(headers);
      expect(removed.status).toBe(403);
      expect(store.announcements.get(id)?.title).toBe('Retiro de jóvenes');
    });
  });
});
