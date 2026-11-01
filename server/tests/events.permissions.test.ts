import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { AppRole } from '../src/types/auth.js';
import { authHeader, buildTestApp } from './helpers.js';

const CAN_READ: AppRole[] = ['admin', 'pastor', 'secretary', 'treasurer'];
const CAN_WRITE: AppRole[] = ['admin', 'pastor', 'secretary'];
const CANNOT_READ: AppRole[] = ['coordinator'];
const CANNOT_WRITE: AppRole[] = ['treasurer', 'coordinator'];

const ID = '00000000-0000-4000-8000-0000000000ff';
const newEvent = {
  title: 'Culto dominical',
  eventDate: '2026-11-08',
  startTime: '10:00',
  type: 'religious',
  category: 'worship',
};

describe('permisos de /api/events', () => {
  it('responde 401 sin token en cada endpoint', async () => {
    const { app } = buildTestApp();
    expect((await request(app).get('/api/events')).status).toBe(401);
    expect((await request(app).post('/api/events').send(newEvent)).status).toBe(401);
    expect((await request(app).patch(`/api/events/${ID}`).send({})).status).toBe(401);
  });

  it.each(CAN_READ)('%s puede consultar los eventos', async (role) => {
    const { app } = buildTestApp();
    const response = await request(app).get('/api/events').set(authHeader(role));
    expect(response.status).toBe(200);
  });

  it.each(CANNOT_READ)('%s recibe 403 al consultar', async (role) => {
    const { app } = buildTestApp();
    const response = await request(app).get('/api/events').set(authHeader(role));
    expect(response.status).toBe(403);
  });

  it.each(CAN_WRITE)('%s puede crear, modificar y cancelar', async (role) => {
    const { app } = buildTestApp();
    const headers = authHeader(role);
    const created = await request(app).post('/api/events').set(headers).send(newEvent);
    expect(created.status).toBe(201);
    const { id } = (created.body as { event: { id: string } }).event;
    const edited = await request(app)
      .patch(`/api/events/${id}`)
      .set(headers)
      .send({ title: 'Otro' });
    expect(edited.status).toBe(200);
    const cancelled = await request(app)
      .patch(`/api/events/${id}`)
      .set(headers)
      .send({ status: 'cancelled' });
    expect(cancelled.status).toBe(200);
  });

  describe.each(CANNOT_WRITE)('rol %s', (role) => {
    it('recibe 403 al escribir y no se crea ni cambia nada', async () => {
      const { app, store } = buildTestApp();
      const headers = authHeader(role);
      const created = await request(app).post('/api/events').set(headers).send(newEvent);
      expect(created.status).toBe(403);
      expect(store.events.size).toBe(0);

      const seeded = await request(app).post('/api/events').set(authHeader('admin')).send(newEvent);
      const { id } = (seeded.body as { event: { id: string } }).event;
      const patch = await request(app)
        .patch(`/api/events/${id}`)
        .set(headers)
        .send({ status: 'cancelled' });
      expect(patch.status).toBe(403);
      expect(store.events.get(id)?.status).toBe('scheduled');
    });
  });
});
