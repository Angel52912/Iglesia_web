import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { AppRole } from '../src/types/auth.js';
import { authHeader, buildTestApp } from './helpers.js';

const CAN_READ: AppRole[] = ['admin', 'pastor', 'secretary'];
const CAN_WRITE: AppRole[] = ['admin', 'secretary'];
const CANNOT_READ: AppRole[] = ['treasurer', 'coordinator'];
const CANNOT_WRITE: AppRole[] = ['pastor', 'treasurer', 'coordinator'];

const newMember = { fullName: 'Ana Pérez' };

describe('permisos de /api/members', () => {
  it('responde 401 sin token en cada endpoint', async () => {
    const { app } = buildTestApp();
    expect((await request(app).get('/api/members')).status).toBe(401);
    expect((await request(app).post('/api/members').send(newMember)).status).toBe(401);
    const patch = await request(app)
      .patch('/api/members/00000000-0000-4000-8000-0000000000ff')
      .send({ active: false });
    expect(patch.status).toBe(401);
  });

  it.each(CAN_READ)('%s puede consultar el listado', async (role) => {
    const { app } = buildTestApp();
    const response = await request(app).get('/api/members').set(authHeader(role));
    expect(response.status).toBe(200);
  });

  it.each(CANNOT_READ)('%s recibe 403 al consultar el listado', async (role) => {
    const { app } = buildTestApp();
    const response = await request(app).get('/api/members').set(authHeader(role));
    expect(response.status).toBe(403);
  });

  it.each(CAN_WRITE)('%s puede registrar y editar', async (role) => {
    const { app } = buildTestApp();
    const created = await request(app).post('/api/members').set(authHeader(role)).send(newMember);
    expect(created.status).toBe(201);
    const { id } = (created.body as { member: { id: string } }).member;
    const updated = await request(app)
      .patch(`/api/members/${id}`)
      .set(authHeader(role))
      .send({ active: false });
    expect(updated.status).toBe(200);
  });

  describe.each(CANNOT_WRITE)('rol %s', (role) => {
    it('recibe 403 al registrar y no se crea nada', async () => {
      const { app, store } = buildTestApp();
      const response = await request(app)
        .post('/api/members')
        .set(authHeader(role))
        .send(newMember);
      expect(response.status).toBe(403);
      expect(store.members.size).toBe(0);
    });

    it('recibe 403 al editar o desactivar y no cambia nada', async () => {
      const { app, store } = buildTestApp();
      const created = await request(app)
        .post('/api/members')
        .set(authHeader('secretary'))
        .send(newMember);
      const { id } = (created.body as { member: { id: string } }).member;
      const response = await request(app)
        .patch(`/api/members/${id}`)
        .set(authHeader(role))
        .send({ active: false });
      expect(response.status).toBe(403);
      expect(store.members.get(id)?.active).toBe(true);
    });
  });
});
