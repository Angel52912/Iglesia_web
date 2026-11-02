import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { AppRole } from '../src/types/auth.js';
import { authHeader, buildTestApp, type TestContext } from './helpers.js';

interface DashboardBody {
  general: {
    activeMembers: number;
    ministries: number;
    attendance: { present: number; total: number };
    upcomingCount: number;
    upcomingEvents: { title: string }[];
  } | null;
  income: { monthTotal: number; monthDonations: number } | null;
}

const today = new Date().toISOString().slice(0, 10);
const nextYear = `${String(new Date().getUTCFullYear() + 1)}-01-10`;

async function seed(app: TestContext['app']): Promise<void> {
  const secretary = authHeader('secretary');
  const ana = await request(app).post('/api/members').set(secretary).send({ fullName: 'Ana' });
  await request(app).post('/api/members').set(secretary).send({ fullName: 'Luis' });
  const anaId = (ana.body as { member: { id: string } }).member.id;
  await request(app).patch(`/api/members/${anaId}`).set(secretary).send({ active: false });
  await request(app).post('/api/events').set(secretary).send({
    title: 'Culto futuro',
    eventDate: nextYear,
    startTime: '10:00',
    type: 'religious',
    category: 'worship',
  });
  await request(app).post('/api/ministries').set(authHeader('pastor')).send({ name: 'Música' });
  await request(app)
    .post('/api/donations')
    .set(authHeader('treasurer'))
    .send({ donatedOn: today, amount: 250.5, concept: 'Diezmo', method: 'cash' });
}

async function dashboardAs(app: TestContext['app'], role: AppRole): Promise<DashboardBody> {
  const response = await request(app).get('/api/dashboard').set(authHeader(role));
  expect(response.status).toBe(200);
  return response.body as DashboardBody;
}

describe('GET /api/dashboard', () => {
  it('responde 401 sin token', async () => {
    const { app } = buildTestApp();
    expect((await request(app).get('/api/dashboard')).status).toBe(401);
  });

  it('el administrador recibe conteos, próximos eventos e ingresos', async () => {
    const { app } = buildTestApp();
    await seed(app);
    const body = await dashboardAs(app, 'admin');
    expect(body.general?.activeMembers).toBe(1);
    expect(body.general?.ministries).toBe(1);
    expect(body.general?.upcomingCount).toBe(1);
    expect(body.general?.upcomingEvents[0]?.title).toBe('Culto futuro');
    expect(body.income?.monthTotal).toBe(250.5);
    expect(body.income?.monthDonations).toBe(1);
  });

  it('con datos vacíos devuelve ceros', async () => {
    const { app } = buildTestApp();
    const body = await dashboardAs(app, 'admin');
    expect(body.general).toMatchObject({ activeMembers: 0, ministries: 0, upcomingCount: 0 });
    expect(body.income?.monthTotal).toBe(0);
  });

  it.each<AppRole>(['admin', 'pastor'])('%s ve datos generales e ingresos', async (role) => {
    const { app } = buildTestApp();
    await seed(app);
    const body = await dashboardAs(app, role);
    expect(body.general).not.toBeNull();
    expect(body.income).not.toBeNull();
  });

  it.each<AppRole>(['secretary', 'coordinator'])(
    '%s ve datos generales y nunca ingresos',
    async (role) => {
      const { app } = buildTestApp();
      await seed(app);
      const response = await request(app).get('/api/dashboard').set(authHeader(role));
      const body = response.body as DashboardBody;
      expect(body.general).not.toBeNull();
      expect(body.income).toBeNull();
      expect(JSON.stringify(response.body)).not.toContain('250.5');
    },
  );

  it('el tesorero ve solo ingresos', async () => {
    const { app } = buildTestApp();
    await seed(app);
    const body = await dashboardAs(app, 'treasurer');
    expect(body.general).toBeNull();
    expect(body.income?.monthTotal).toBe(250.5);
  });
});
