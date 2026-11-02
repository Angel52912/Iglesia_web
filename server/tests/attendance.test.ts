import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { reportRange } from '../src/modules/attendance/attendance.service.js';
import { authHeader, buildTestApp, type TestContext } from './helpers.js';

const asSecretary = authHeader('secretary');
const missingId = '00000000-0000-4000-8000-0000000000ff';

async function createEvent(
  app: TestContext['app'],
  eventDate = '2026-11-08',
  title = 'Culto dominical',
): Promise<string> {
  const response = await request(app)
    .post('/api/events')
    .set(asSecretary)
    .send({ title, eventDate, startTime: '10:00', type: 'religious', category: 'worship' });
  return (response.body as { event: { id: string } }).event.id;
}

async function createMember(app: TestContext['app'], fullName: string): Promise<string> {
  const response = await request(app).post('/api/members').set(asSecretary).send({ fullName });
  return (response.body as { member: { id: string } }).member.id;
}

describe('PUT /api/attendance/events/:eventId', () => {
  it('registra presentes y ausentes y los devuelve ordenados por nombre', async () => {
    const { app } = buildTestApp();
    const eventId = await createEvent(app);
    const ana = await createMember(app, 'Ana');
    const luis = await createMember(app, 'Luis');
    const response = await request(app)
      .put(`/api/attendance/events/${eventId}`)
      .set(asSecretary)
      .send({
        records: [
          { memberId: luis, present: false },
          { memberId: ana, present: true },
        ],
      });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      event: { id: eventId, title: 'Culto dominical' },
      records: [
        { memberId: ana, fullName: 'Ana', present: true },
        { memberId: luis, fullName: 'Luis', present: false },
      ],
    });
  });

  it('volver a guardar corrige la asistencia sin duplicar filas', async () => {
    const { app, store } = buildTestApp();
    const eventId = await createEvent(app);
    const ana = await createMember(app, 'Ana');
    const put = (present: boolean) =>
      request(app)
        .put(`/api/attendance/events/${eventId}`)
        .set(asSecretary)
        .send({ records: [{ memberId: ana, present }] });
    await put(false);
    const second = await put(true);
    expect(second.status).toBe(200);
    expect(store.attendance.get(eventId)?.size).toBe(1);
    expect(store.attendance.get(eventId)?.get(ana)).toBe(true);
  });

  it('responde 404 si el evento no existe', async () => {
    const { app } = buildTestApp();
    const ana = await createMember(app, 'Ana');
    const response = await request(app)
      .put(`/api/attendance/events/${missingId}`)
      .set(asSecretary)
      .send({ records: [{ memberId: ana, present: true }] });
    expect(response.status).toBe(404);
  });

  it('responde 409 si el evento está cancelado', async () => {
    const { app, store } = buildTestApp();
    const eventId = await createEvent(app);
    const ana = await createMember(app, 'Ana');
    await request(app)
      .patch(`/api/events/${eventId}`)
      .set(asSecretary)
      .send({ status: 'cancelled' });
    const response = await request(app)
      .put(`/api/attendance/events/${eventId}`)
      .set(asSecretary)
      .send({ records: [{ memberId: ana, present: true }] });
    expect(response.status).toBe(409);
    expect(store.attendance.size).toBe(0);
  });

  it('responde 400 si un miembro no existe y no guarda nada', async () => {
    const { app, store } = buildTestApp();
    const eventId = await createEvent(app);
    const ana = await createMember(app, 'Ana');
    const response = await request(app)
      .put(`/api/attendance/events/${eventId}`)
      .set(asSecretary)
      .send({
        records: [
          { memberId: ana, present: true },
          { memberId: missingId, present: true },
        ],
      });
    expect(response.status).toBe(400);
    expect(store.attendance.size).toBe(0);
  });

  it.each([
    ['lista vacía', { records: [] }],
    ['sin lista', {}],
    ['present no booleano', { records: [{ memberId: missingId, present: 'si' }] }],
    ['identificador inválido', { records: [{ memberId: 'x', present: true }] }],
    [
      'miembros repetidos',
      {
        records: [
          { memberId: missingId, present: true },
          { memberId: missingId, present: false },
        ],
      },
    ],
  ])('responde 400 con %s', async (_name, body) => {
    const { app } = buildTestApp();
    const eventId = await createEvent(app);
    const response = await request(app)
      .put(`/api/attendance/events/${eventId}`)
      .set(asSecretary)
      .send(body);
    expect(response.status).toBe(400);
  });

  it('responde 400 si el id del evento no es un uuid', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .put('/api/attendance/events/abc')
      .set(asSecretary)
      .send({ records: [{ memberId: missingId, present: true }] });
    expect(response.status).toBe(400);
  });
});

describe('GET /api/attendance/events/:eventId', () => {
  it('devuelve el evento con lista vacía si aún no hay asistencia', async () => {
    const { app } = buildTestApp();
    const eventId = await createEvent(app);
    const response = await request(app).get(`/api/attendance/events/${eventId}`).set(asSecretary);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ event: { id: eventId }, records: [] });
  });

  it('responde 404 si el evento no existe', async () => {
    const { app } = buildTestApp();
    const response = await request(app).get(`/api/attendance/events/${missingId}`).set(asSecretary);
    expect(response.status).toBe(404);
  });
});

async function seedAttendance(app: TestContext['app']): Promise<void> {
  const ana = await createMember(app, 'Ana');
  const luis = await createMember(app, 'Luis');
  const marks = [
    { memberId: ana, present: true },
    { memberId: luis, present: false },
  ];
  // 2 y 8 de nov. (misma semana lunes-domingo), 20 de nov. (otra semana, mismo mes) y 3 de dic.
  for (const [date, title] of [
    ['2026-11-02', 'Reunión de oración'],
    ['2026-11-08', 'Culto dominical'],
    ['2026-11-20', 'Ensayo'],
    ['2026-12-03', 'Culto de diciembre'],
  ] as const) {
    const eventId = await createEvent(app, date, title);
    await request(app)
      .put(`/api/attendance/events/${eventId}`)
      .set(asSecretary)
      .send({ records: marks });
  }
}

describe('GET /api/attendance/history', () => {
  it('lista eventos con presentes y ausentes, el más reciente primero', async () => {
    const { app } = buildTestApp();
    await seedAttendance(app);
    const response = await request(app).get('/api/attendance/history').set(asSecretary);
    expect(response.status).toBe(200);
    const { history } = response.body as { history: { title: string; present: number }[] };
    expect(history.map((h) => h.title)).toEqual([
      'Culto de diciembre',
      'Ensayo',
      'Culto dominical',
      'Reunión de oración',
    ]);
    expect(history[0]).toMatchObject({ present: 1, absent: 1 });
  });

  it('filtra por rango de fechas', async () => {
    const { app } = buildTestApp();
    await seedAttendance(app);
    const response = await request(app)
      .get('/api/attendance/history?from=2026-11-05&to=2026-11-30')
      .set(asSecretary);
    const { history } = response.body as { history: { title: string }[] };
    expect(history.map((h) => h.title)).toEqual(['Ensayo', 'Culto dominical']);
  });

  it('responde 400 si el rango está invertido', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .get('/api/attendance/history?from=2026-12-01&to=2026-11-01')
      .set(asSecretary);
    expect(response.status).toBe(400);
  });
});

describe('GET /api/attendance/report', () => {
  it('reporte semanal: lunes a domingo con totales', async () => {
    const { app } = buildTestApp();
    await seedAttendance(app);
    const response = await request(app)
      .get('/api/attendance/report?period=week&date=2026-11-05')
      .set(asSecretary);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      report: {
        period: 'week',
        from: '2026-11-02',
        to: '2026-11-08',
        totals: { events: 2, present: 2, absent: 2 },
      },
    });
  });

  it('reporte mensual: todo el mes calendario', async () => {
    const { app } = buildTestApp();
    await seedAttendance(app);
    const response = await request(app)
      .get('/api/attendance/report?period=month&date=2026-11-15')
      .set(asSecretary);
    expect(response.body).toMatchObject({
      report: {
        from: '2026-11-01',
        to: '2026-11-30',
        totals: { events: 3, present: 3, absent: 3 },
      },
    });
  });

  it('periodo sin asistencia devuelve totales en cero', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .get('/api/attendance/report?period=month&date=2026-01-10')
      .set(asSecretary);
    expect(response.body).toMatchObject({
      report: { totals: { events: 0, present: 0, absent: 0 }, events: [] },
    });
  });

  it.each(['', '?period=year&date=2026-11-01', '?period=week', '?period=week&date=hoy'])(
    'responde 400 con la consulta "%s"',
    async (query) => {
      const { app } = buildTestApp();
      const response = await request(app).get(`/api/attendance/report${query}`).set(asSecretary);
      expect(response.status).toBe(400);
    },
  );
});

describe('reportRange', () => {
  it.each([
    ['week', '2026-11-01', '2026-10-26', '2026-11-01'],
    ['week', '2026-11-02', '2026-11-02', '2026-11-08'],
    ['month', '2028-02-10', '2028-02-01', '2028-02-29'],
    ['month', '2026-12-31', '2026-12-01', '2026-12-31'],
  ] as const)('%s de %s', (period, date, from, to) => {
    expect(reportRange(period, date)).toEqual({ from, to });
  });
});
