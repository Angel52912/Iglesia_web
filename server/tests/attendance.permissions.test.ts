import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { AppRole } from '../src/types/auth.js';
import { authHeader, buildTestApp, type TestContext } from './helpers.js';

const CAN_READ: AppRole[] = ['admin', 'pastor', 'secretary'];
const CAN_WRITE: AppRole[] = ['admin', 'secretary'];
// El coordinador (registrar) llega con coordinator_policies.
const CANNOT_READ: AppRole[] = ['treasurer', 'coordinator'];
const CANNOT_WRITE: AppRole[] = ['pastor', 'treasurer', 'coordinator'];

const ID = '00000000-0000-4000-8000-0000000000ff';
const READ_URLS = [
  '/api/attendance/history',
  '/api/attendance/report?period=week&date=2026-11-05',
  `/api/attendance/events/${ID}`,
];

async function seedEventAndMember(
  app: TestContext['app'],
): Promise<{ eventId: string; memberId: string }> {
  const admin = authHeader('admin');
  const event = await request(app).post('/api/events').set(admin).send({
    title: 'Culto',
    eventDate: '2026-11-08',
    startTime: '10:00',
    type: 'religious',
    category: 'worship',
  });
  const member = await request(app).post('/api/members').set(admin).send({ fullName: 'Ana' });
  return {
    eventId: (event.body as { event: { id: string } }).event.id,
    memberId: (member.body as { member: { id: string } }).member.id,
  };
}

describe('permisos de /api/attendance', () => {
  it('responde 401 sin token en cada endpoint', async () => {
    const { app } = buildTestApp();
    for (const url of READ_URLS) {
      expect((await request(app).get(url)).status).toBe(401);
    }
    const put = await request(app).put(`/api/attendance/events/${ID}`).send({});
    expect(put.status).toBe(401);
  });

  describe.each(CAN_READ)('rol %s', (role) => {
    it('puede consultar historial, reporte y asistencia de un evento', async () => {
      const { app } = buildTestApp();
      const { eventId } = await seedEventAndMember(app);
      const headers = authHeader(role);
      const urls = [READ_URLS[0], READ_URLS[1], `/api/attendance/events/${eventId}`];
      for (const url of urls) {
        expect(
          (
            await request(app)
              .get(url ?? '')
              .set(headers)
          ).status,
        ).toBe(200);
      }
    });
  });

  describe.each(CANNOT_READ)('rol %s', (role) => {
    it('recibe 403 al consultar', async () => {
      const { app } = buildTestApp();
      for (const url of READ_URLS) {
        const response = await request(app).get(url).set(authHeader(role));
        expect(response.status).toBe(403);
      }
    });
  });

  it.each(CAN_WRITE)('%s puede registrar asistencia', async (role) => {
    const { app, store } = buildTestApp();
    const { eventId, memberId } = await seedEventAndMember(app);
    const response = await request(app)
      .put(`/api/attendance/events/${eventId}`)
      .set(authHeader(role))
      .send({ records: [{ memberId, present: true }] });
    expect(response.status).toBe(200);
    expect(store.attendance.get(eventId)?.get(memberId)).toBe(true);
  });

  it.each(CANNOT_WRITE)('%s recibe 403 al registrar y no se guarda nada', async (role) => {
    const { app, store } = buildTestApp();
    const { eventId, memberId } = await seedEventAndMember(app);
    const response = await request(app)
      .put(`/api/attendance/events/${eventId}`)
      .set(authHeader(role))
      .send({ records: [{ memberId, present: true }] });
    expect(response.status).toBe(403);
    expect(store.attendance.size).toBe(0);
  });
});
