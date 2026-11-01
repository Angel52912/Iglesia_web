import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authHeader, buildTestApp, type TestContext } from './helpers.js';

const asSecretary = authHeader('secretary');
const missingId = '00000000-0000-4000-8000-0000000000ff';

const baseEvent = {
  title: 'Culto dominical',
  eventDate: '2026-11-08',
  startTime: '10:00',
  type: 'religious',
  category: 'worship',
};

async function createEvent(
  app: TestContext['app'],
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const response = await request(app)
    .post('/api/events')
    .set(asSecretary)
    .send({ ...baseEvent, ...overrides });
  expect(response.status).toBe(201);
  return (response.body as { event: { id: string } }).event.id;
}

async function createMember(app: TestContext['app'], fullName: string): Promise<string> {
  const response = await request(app).post('/api/members').set(asSecretary).send({ fullName });
  return (response.body as { member: { id: string } }).member.id;
}

describe('POST /api/events', () => {
  it('crea un evento con título, fecha, hora, lugar y descripción', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .post('/api/events')
      .set(asSecretary)
      .send({ ...baseEvent, title: '  Culto ', location: 'Templo', description: 'Alabanza' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      event: {
        title: 'Culto',
        eventDate: '2026-11-08',
        startTime: '10:00',
        location: 'Templo',
        description: 'Alabanza',
        type: 'religious',
        category: 'worship',
        status: 'scheduled',
        responsibles: [],
      },
    });
  });

  it('lugar y descripción vacíos se guardan como null', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .post('/api/events')
      .set(asSecretary)
      .send({ ...baseEvent, location: '', description: '   ' });
    expect(response.body).toMatchObject({ event: { location: null, description: null } });
  });

  it('asigna responsables y los muestra sin repetir', async () => {
    const { app } = buildTestApp();
    const ana = await createMember(app, 'Ana Pérez');
    const response = await request(app)
      .post('/api/events')
      .set(asSecretary)
      .send({ ...baseEvent, responsibleIds: [ana, ana] });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      event: { responsibles: [{ id: ana, fullName: 'Ana Pérez' }] },
    });
  });

  it('vincula el evento a un ministerio', async () => {
    const { app } = buildTestApp();
    const created = await request(app)
      .post('/api/ministries')
      .set(authHeader('pastor'))
      .send({ name: 'Música' });
    const { id } = (created.body as { ministry: { id: string } }).ministry;
    const response = await request(app)
      .post('/api/events')
      .set(asSecretary)
      .send({ ...baseEvent, ministryId: id });
    expect(response.body).toMatchObject({ event: { ministryId: id, ministryName: 'Música' } });
  });

  it.each([
    ['sin título', { title: ' ' }],
    ['fecha inválida', { eventDate: '2026-13-40' }],
    ['hora inválida', { startTime: '25:61' }],
    ['tipo inválido', { type: 'otro' }],
    ['categoría inválida', { category: 'fiesta' }],
    ['responsable inexistente', { responsibleIds: [missingId] }],
    ['responsable que no es UUID', { responsibleIds: ['abc'] }],
    ['ministerio inexistente', { ministryId: missingId }],
  ])('rechaza con 400: %s', async (_caso, overrides) => {
    const { app } = buildTestApp();
    const response = await request(app)
      .post('/api/events')
      .set(asSecretary)
      .send({ ...baseEvent, ...overrides });
    expect(response.status).toBe(400);
  });
});

describe('GET /api/events', () => {
  it('filtra por rango de fechas, estado y ministerio, ordenado por fecha y hora', async () => {
    const { app } = buildTestApp();
    await createEvent(app, { title: 'B', eventDate: '2026-11-10', startTime: '09:00' });
    await createEvent(app, { title: 'A', eventDate: '2026-11-10', startTime: '08:00' });
    await createEvent(app, { title: 'C', eventDate: '2026-12-01' });
    const cancelled = await createEvent(app, { title: 'D', eventDate: '2026-11-12' });
    await request(app)
      .patch(`/api/events/${cancelled}`)
      .set(asSecretary)
      .send({ status: 'cancelled' });

    const november = await request(app)
      .get('/api/events?from=2026-11-01&to=2026-11-30')
      .set(asSecretary);
    const titles = (november.body as { events: { title: string }[] }).events.map((e) => e.title);
    expect(titles).toEqual(['A', 'B', 'D']);

    const active = await request(app)
      .get('/api/events?from=2026-11-01&to=2026-11-30&status=scheduled')
      .set(asSecretary);
    expect((active.body as { events: unknown[] }).events).toHaveLength(2);
  });

  it.each([
    ['fecha mal escrita', 'from=ayer'],
    ['rango invertido', 'from=2026-12-01&to=2026-11-01'],
    ['estado inválido', 'status=otro'],
    ['ministerio que no es UUID', 'ministryId=abc'],
  ])('rechaza con 400: %s', async (_caso, query) => {
    const { app } = buildTestApp();
    const response = await request(app).get(`/api/events?${query}`).set(asSecretary);
    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/events/:id', () => {
  it('modifica datos y reemplaza responsables', async () => {
    const { app } = buildTestApp();
    const ana = await createMember(app, 'Ana Pérez');
    const luis = await createMember(app, 'Luis Gómez');
    const id = await createEvent(app, { responsibleIds: [ana] });

    const response = await request(app)
      .patch(`/api/events/${id}`)
      .set(asSecretary)
      .send({ title: 'Culto especial', startTime: '18:30', responsibleIds: [luis] });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      event: {
        title: 'Culto especial',
        startTime: '18:30',
        responsibles: [{ id: luis, fullName: 'Luis Gómez' }],
      },
    });
  });

  it('cancela y reactiva un evento sin eliminarlo', async () => {
    const { app, store } = buildTestApp();
    const id = await createEvent(app);
    const cancelled = await request(app)
      .patch(`/api/events/${id}`)
      .set(asSecretary)
      .send({ status: 'cancelled' });
    expect(cancelled.body).toMatchObject({ event: { status: 'cancelled' } });
    expect(store.events.size).toBe(1);
    const restored = await request(app)
      .patch(`/api/events/${id}`)
      .set(asSecretary)
      .send({ status: 'scheduled' });
    expect(restored.body).toMatchObject({ event: { status: 'scheduled' } });
  });

  it('quita el ministerio y deja vacíos los textos opcionales con null', async () => {
    const { app } = buildTestApp();
    const id = await createEvent(app, { location: 'Templo' });
    const response = await request(app)
      .patch(`/api/events/${id}`)
      .set(asSecretary)
      .send({ location: '', ministryId: null });
    expect(response.body).toMatchObject({ event: { location: null, ministryId: null } });
  });

  it('responde 404 si no existe y 400 con datos malos o sin cambios', async () => {
    const { app } = buildTestApp();
    const id = await createEvent(app);
    const missing = await request(app)
      .patch(`/api/events/${missingId}`)
      .set(asSecretary)
      .send({ title: 'X' });
    expect(missing.status).toBe(404);
    expect((await request(app).patch(`/api/events/${id}`).set(asSecretary).send({})).status).toBe(
      400,
    );
    const badStatus = await request(app)
      .patch(`/api/events/${id}`)
      .set(asSecretary)
      .send({ status: 'borrado' });
    expect(badStatus.status).toBe(400);
    expect((await request(app).patch('/api/events/abc').set(asSecretary).send({})).status).toBe(
      400,
    );
  });
});
