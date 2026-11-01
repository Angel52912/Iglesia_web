import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authHeader, buildTestApp, type TestContext } from './helpers.js';

const asPastor = authHeader('pastor');
const missingId = '00000000-0000-4000-8000-0000000000ff';

async function createMinistry(app: TestContext['app'], name = 'Música'): Promise<string> {
  const response = await request(app).post('/api/ministries').set(asPastor).send({ name });
  expect(response.status).toBe(201);
  return (response.body as { ministry: { id: string } }).ministry.id;
}

async function createMember(app: TestContext['app'], fullName: string): Promise<string> {
  const response = await request(app)
    .post('/api/members')
    .set(authHeader('secretary'))
    .send({ fullName });
  expect(response.status).toBe(201);
  return (response.body as { member: { id: string } }).member.id;
}

describe('POST /api/ministries', () => {
  it('registra un ministerio activo y recorta el nombre', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .post('/api/ministries')
      .set(asPastor)
      .send({ name: '  Jóvenes ', description: 'Grupo de jóvenes' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ministry: { name: 'Jóvenes', description: 'Grupo de jóvenes', active: true, memberCount: 0 },
    });
  });

  it('descripción vacía se guarda como null', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .post('/api/ministries')
      .set(asPastor)
      .send({ name: 'Niños', description: '  ' });
    expect(response.body).toMatchObject({ ministry: { description: null } });
  });

  it('responde 409 si el nombre ya existe (sin distinguir mayúsculas)', async () => {
    const { app } = buildTestApp();
    await createMinistry(app, 'Música');
    const response = await request(app)
      .post('/api/ministries')
      .set(asPastor)
      .send({ name: 'música' });
    expect(response.status).toBe(409);
  });

  it.each([
    ['sin nombre', {}],
    ['nombre vacío', { name: '   ' }],
    ['nombre muy largo', { name: 'x'.repeat(81) }],
  ])('rechaza con 400: %s', async (_caso, body) => {
    const { app } = buildTestApp();
    const response = await request(app).post('/api/ministries').set(asPastor).send(body);
    expect(response.status).toBe(400);
  });
});

describe('GET /api/ministries', () => {
  it('lista los ministerios ordenados por nombre', async () => {
    const { app } = buildTestApp();
    await createMinistry(app, 'Niños');
    await createMinistry(app, 'Alabanza');
    const response = await request(app).get('/api/ministries').set(asPastor);
    expect(response.status).toBe(200);
    const names = (response.body as { ministries: { name: string }[] }).ministries.map(
      (m) => m.name,
    );
    expect(names).toEqual(['Alabanza', 'Niños']);
  });

  it('devuelve el detalle con integrantes y 404 si no existe', async () => {
    const { app } = buildTestApp();
    const id = await createMinistry(app);
    const ok = await request(app).get(`/api/ministries/${id}`).set(asPastor);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ ministry: { id, members: [], coordinators: [] } });
    expect((await request(app).get(`/api/ministries/${missingId}`).set(asPastor)).status).toBe(404);
    expect((await request(app).get('/api/ministries/abc').set(asPastor)).status).toBe(400);
  });
});

describe('PATCH /api/ministries/:id', () => {
  it('edita y desactiva sin eliminar', async () => {
    const { app } = buildTestApp();
    const id = await createMinistry(app);
    const response = await request(app)
      .patch(`/api/ministries/${id}`)
      .set(asPastor)
      .send({ name: 'Alabanza', active: false });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ministry: { name: 'Alabanza', active: false } });
  });

  it('responde 404 si no existe, 409 si el nombre choca y 400 sin cambios', async () => {
    const { app } = buildTestApp();
    const id = await createMinistry(app, 'Música');
    await createMinistry(app, 'Niños');
    const missing = await request(app)
      .patch(`/api/ministries/${missingId}`)
      .set(asPastor)
      .send({ active: false });
    expect(missing.status).toBe(404);
    const clash = await request(app)
      .patch(`/api/ministries/${id}`)
      .set(asPastor)
      .send({ name: 'Niños' });
    expect(clash.status).toBe(409);
    expect((await request(app).patch(`/api/ministries/${id}`).set(asPastor).send({})).status).toBe(
      400,
    );
  });
});

describe('coordinadores e integrantes', () => {
  it('asigna coordinadores y vincula integrantes', async () => {
    const { app } = buildTestApp();
    const id = await createMinistry(app);
    const ana = await createMember(app, 'Ana Pérez');
    const luis = await createMember(app, 'Luis Gómez');

    const coordinators = await request(app)
      .put(`/api/ministries/${id}/coordinators`)
      .set(asPastor)
      .send({ memberIds: [ana] });
    expect(coordinators.status).toBe(200);
    expect(coordinators.body).toMatchObject({
      ministry: { coordinators: [{ id: ana, fullName: 'Ana Pérez' }] },
    });

    const members = await request(app)
      .put(`/api/ministries/${id}/members`)
      .set(asPastor)
      .send({ memberIds: [ana, luis, ana] });
    expect(members.status).toBe(200);
    expect(members.body).toMatchObject({ ministry: { memberCount: 2 } });

    const listed = await request(app).get('/api/ministries').set(asPastor);
    expect(listed.body).toMatchObject({
      ministries: [{ id, memberCount: 2, coordinators: [{ id: ana }] }],
    });
  });

  it('reemplaza la lista completa y permite dejarla vacía', async () => {
    const { app } = buildTestApp();
    const id = await createMinistry(app);
    const ana = await createMember(app, 'Ana Pérez');
    await request(app)
      .put(`/api/ministries/${id}/members`)
      .set(asPastor)
      .send({ memberIds: [ana] });
    const response = await request(app)
      .put(`/api/ministries/${id}/members`)
      .set(asPastor)
      .send({ memberIds: [] });
    expect(response.body).toMatchObject({ ministry: { memberCount: 0, members: [] } });
  });

  it.each([
    ['miembro inexistente', { memberIds: [missingId] }, 400],
    ['id que no es UUID', { memberIds: ['abc'] }, 400],
    ['sin lista', {}, 400],
  ])('rechaza: %s', async (_caso, body, status) => {
    const { app } = buildTestApp();
    const id = await createMinistry(app);
    const response = await request(app)
      .put(`/api/ministries/${id}/members`)
      .set(asPastor)
      .send(body);
    expect(response.status).toBe(status);
  });

  it('responde 404 si el ministerio no existe', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .put(`/api/ministries/${missingId}/coordinators`)
      .set(asPastor)
      .send({ memberIds: [] });
    expect(response.status).toBe(404);
  });
});
