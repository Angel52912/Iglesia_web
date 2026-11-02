import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { AppRole } from '../src/types/auth.js';
import { authHeader, buildTestApp } from './helpers.js';

const CAN_MANAGE: AppRole[] = ['admin', 'treasurer'];
// El pastor solo ve el resumen; secretario y coordinador no ven nada.
const CANNOT_MANAGE: AppRole[] = ['pastor', 'secretary', 'coordinator'];
const CAN_SUMMARY: AppRole[] = ['admin', 'pastor', 'treasurer'];
const CANNOT_SUMMARY: AppRole[] = ['secretary', 'coordinator'];

const ID = '00000000-0000-4000-8000-0000000000ff';
const newDonation = { donatedOn: '2026-11-01', amount: 150.5, concept: 'Diezmo', method: 'cash' };

describe('permisos de /api/donations', () => {
  it('responde 401 sin token en cada endpoint', async () => {
    const { app } = buildTestApp();
    expect((await request(app).get('/api/donations')).status).toBe(401);
    expect((await request(app).get('/api/donations/donors')).status).toBe(401);
    expect((await request(app).get('/api/donations/summary?month=2026-11')).status).toBe(401);
    expect((await request(app).post('/api/donations').send(newDonation)).status).toBe(401);
    expect((await request(app).patch(`/api/donations/${ID}`).send({})).status).toBe(401);
    expect((await request(app).delete(`/api/donations/${ID}`)).status).toBe(401);
  });

  it.each(CAN_MANAGE)('%s puede registrar, consultar, editar y eliminar', async (role) => {
    const { app } = buildTestApp();
    const headers = authHeader(role);
    const created = await request(app).post('/api/donations').set(headers).send(newDonation);
    expect(created.status).toBe(201);
    const { id } = (created.body as { donation: { id: string } }).donation;
    expect((await request(app).get('/api/donations').set(headers)).status).toBe(200);
    expect((await request(app).get('/api/donations/donors').set(headers)).status).toBe(200);
    const edited = await request(app)
      .patch(`/api/donations/${id}`)
      .set(headers)
      .send({ amount: 200 });
    expect(edited.status).toBe(200);
    expect((await request(app).delete(`/api/donations/${id}`).set(headers)).status).toBe(204);
  });

  describe.each(CANNOT_MANAGE)('rol %s', (role) => {
    it('recibe 403 en las filas y no se crea, cambia ni borra nada', async () => {
      const { app, store } = buildTestApp();
      const headers = authHeader(role);
      expect((await request(app).get('/api/donations').set(headers)).status).toBe(403);
      expect((await request(app).get('/api/donations/donors').set(headers)).status).toBe(403);
      const created = await request(app).post('/api/donations').set(headers).send(newDonation);
      expect(created.status).toBe(403);
      expect(store.donations.size).toBe(0);

      const seeded = await request(app)
        .post('/api/donations')
        .set(authHeader('treasurer'))
        .send(newDonation);
      const { id } = (seeded.body as { donation: { id: string } }).donation;
      const patch = await request(app)
        .patch(`/api/donations/${id}`)
        .set(headers)
        .send({ amount: 1 });
      expect(patch.status).toBe(403);
      expect(store.donations.get(id)?.amount).toBe(150.5);
      expect((await request(app).delete(`/api/donations/${id}`).set(headers)).status).toBe(403);
      expect(store.donations.has(id)).toBe(true);
    });
  });

  it.each(CAN_SUMMARY)('%s puede ver el resumen mensual', async (role) => {
    const { app } = buildTestApp();
    const response = await request(app)
      .get('/api/donations/summary?month=2026-11')
      .set(authHeader(role));
    expect(response.status).toBe(200);
  });

  it.each(CANNOT_SUMMARY)('%s recibe 403 al pedir el resumen', async (role) => {
    const { app } = buildTestApp();
    const response = await request(app)
      .get('/api/donations/summary?month=2026-11')
      .set(authHeader(role));
    expect(response.status).toBe(403);
  });

  it('el resumen del pastor no incluye donantes ni filas individuales', async () => {
    const { app } = buildTestApp();
    const member = await request(app)
      .post('/api/members')
      .set(authHeader('admin'))
      .send({ fullName: 'Ana Pérez' });
    const { id: memberId } = (member.body as { member: { id: string } }).member;
    await request(app)
      .post('/api/donations')
      .set(authHeader('treasurer'))
      .send({ ...newDonation, memberId });

    const response = await request(app)
      .get('/api/donations/summary?month=2026-11')
      .set(authHeader('pastor'));
    expect(Object.keys((response.body as { summary: object }).summary).sort()).toEqual([
      'byConcept',
      'byMethod',
      'donations',
      'from',
      'month',
      'to',
      'total',
    ]);
    expect(JSON.stringify(response.body)).not.toContain('Ana Pérez');
  });
});
