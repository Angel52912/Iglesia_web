import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authHeader, buildTestApp } from './helpers.js';

const asSecretary = authHeader('secretary');

async function createMember(
  app: ReturnType<typeof buildTestApp>['app'],
  body: Record<string, unknown>,
): Promise<{ id: string }> {
  const response = await request(app).post('/api/members').set(asSecretary).send(body);
  expect(response.status).toBe(201);
  return (response.body as { member: { id: string } }).member;
}

describe('POST /api/members', () => {
  it('registra un miembro con nombre, teléfono, correo y fecha de ingreso', async () => {
    const { app } = buildTestApp();
    const response = await request(app).post('/api/members').set(asSecretary).send({
      fullName: '  Ana Pérez ',
      phone: '5551234567',
      email: 'Ana@Correo.com',
      joinedOn: '2026-05-10',
    });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      member: {
        fullName: 'Ana Pérez',
        phone: '5551234567',
        email: 'ana@correo.com',
        joinedOn: '2026-05-10',
        active: true,
      },
    });
  });

  it('acepta solo el nombre y deja teléfono y correo en null', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .post('/api/members')
      .set(asSecretary)
      .send({ fullName: 'Luis', phone: '', email: '' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ member: { phone: null, email: null } });
  });

  it.each([
    ['sin nombre', { phone: '555' }],
    ['nombre vacío', { fullName: '   ' }],
    ['correo inválido', { fullName: 'Ana', email: 'no-es-correo' }],
    ['teléfono con letras', { fullName: 'Ana', phone: 'abc' }],
    ['teléfono con menos de 10 números', { fullName: 'Ana', phone: '555123456' }],
    ['teléfono con más de 10 números', { fullName: 'Ana', phone: '55512345678' }],
    ['teléfono con espacios o guiones', { fullName: 'Ana', phone: '555-123-4567' }],
    ['nombre con números', { fullName: 'Ana 2' }],
    ['nombre con símbolos', { fullName: 'Ana_Pérez!' }],
    ['fecha inválida', { fullName: 'Ana', joinedOn: '31/12/2026' }],
  ])('responde 400 %s', async (_name, body) => {
    const { app, store } = buildTestApp();
    const response = await request(app).post('/api/members').set(asSecretary).send(body);
    expect(response.status).toBe(400);
    expect(store.members.size).toBe(0);
  });
});

describe('GET /api/members', () => {
  it('lista, busca por nombre y filtra por estado', async () => {
    const { app } = buildTestApp();
    await createMember(app, { fullName: 'Ana Pérez' });
    const luis = await createMember(app, { fullName: 'Luis Gómez' });
    await request(app).patch(`/api/members/${luis.id}`).set(asSecretary).send({ active: false });

    const all = await request(app).get('/api/members').set(asSecretary);
    expect((all.body as { members: unknown[] }).members).toHaveLength(2);

    const byName = await request(app).get('/api/members?search=ana').set(asSecretary);
    expect(byName.body).toMatchObject({ members: [{ fullName: 'Ana Pérez' }] });

    const inactive = await request(app).get('/api/members?active=false').set(asSecretary);
    expect(inactive.body).toMatchObject({ members: [{ fullName: 'Luis Gómez', active: false }] });

    const active = await request(app).get('/api/members?active=true').set(asSecretary);
    expect(active.body).toMatchObject({ members: [{ fullName: 'Ana Pérez' }] });
  });

  it('responde 400 con un filtro de estado inválido', async () => {
    const { app } = buildTestApp();
    const response = await request(app).get('/api/members?active=quizas').set(asSecretary);
    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/members/:id', () => {
  it('edita datos personales', async () => {
    const { app } = buildTestApp();
    const { id } = await createMember(app, { fullName: 'Ana', phone: '5550001111' });
    const response = await request(app)
      .patch(`/api/members/${id}`)
      .set(asSecretary)
      .send({ fullName: 'Ana María', phone: '' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ member: { fullName: 'Ana María', phone: null } });
  });

  it('desactiva sin eliminar y permite reactivar', async () => {
    const { app, store } = buildTestApp();
    const { id } = await createMember(app, { fullName: 'Ana' });
    await request(app).patch(`/api/members/${id}`).set(asSecretary).send({ active: false });
    expect(store.members.get(id)?.active).toBe(false);
    await request(app).patch(`/api/members/${id}`).set(asSecretary).send({ active: true });
    expect(store.members.get(id)?.active).toBe(true);
  });

  it('responde 404 si el miembro no existe', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .patch('/api/members/00000000-0000-4000-8000-0000000000ff')
      .set(asSecretary)
      .send({ active: false });
    expect(response.status).toBe(404);
  });

  it('responde 400 con id inválido o sin cambios', async () => {
    const { app } = buildTestApp();
    const { id } = await createMember(app, { fullName: 'Ana' });
    const badId = await request(app)
      .patch('/api/members/xyz')
      .set(asSecretary)
      .send({ active: false });
    expect(badId.status).toBe(400);
    const empty = await request(app).patch(`/api/members/${id}`).set(asSecretary).send({});
    expect(empty.status).toBe(400);
  });

  it('no expone DELETE: los miembros no se eliminan', async () => {
    const { app, store } = buildTestApp();
    const { id } = await createMember(app, { fullName: 'Ana' });
    const response = await request(app).delete(`/api/members/${id}`).set(asSecretary);
    expect(response.status).toBe(404);
    expect(store.members.has(id)).toBe(true);
  });
});

describe('normalización de correo y campos vacíos', () => {
  it('POST convierte el correo a minúsculas y lo guarda así', async () => {
    const { app, store } = buildTestApp();
    const response = await request(app)
      .post('/api/members')
      .set(asSecretary)
      .send({ fullName: 'Ana', email: 'ANA.Perez@Correo.COM' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ member: { email: 'ana.perez@correo.com' } });
    const { id } = (response.body as { member: { id: string } }).member;
    expect(store.members.get(id)?.email).toBe('ana.perez@correo.com');
  });

  it('PATCH convierte el correo a minúsculas y lo guarda así', async () => {
    const { app, store } = buildTestApp();
    const { id } = await createMember(app, { fullName: 'Ana' });
    const response = await request(app)
      .patch(`/api/members/${id}`)
      .set(asSecretary)
      .send({ email: 'NUEVO@Correo.Com' });
    expect(response.status).toBe(200);
    expect(store.members.get(id)?.email).toBe('nuevo@correo.com');
  });

  it.each(['phone', 'email'] as const)('POST guarda %s vacío como null', async (field) => {
    const { app, store } = buildTestApp();
    const response = await request(app)
      .post('/api/members')
      .set(asSecretary)
      .send({ fullName: 'Luis', phone: '5550001111', email: 'luis@correo.com', [field]: '' });
    expect(response.status).toBe(201);
    const { id } = (response.body as { member: { id: string } }).member;
    expect(store.members.get(id)?.[field]).toBeNull();
  });

  it.each(['phone', 'email'] as const)(
    'POST guarda %s con solo espacios como null',
    async (field) => {
      const { app, store } = buildTestApp();
      const response = await request(app)
        .post('/api/members')
        .set(asSecretary)
        .send({ fullName: 'Luis', [field]: '   ' });
      expect(response.status).toBe(201);
      const { id } = (response.body as { member: { id: string } }).member;
      expect(store.members.get(id)?.[field]).toBeNull();
    },
  );

  it.each(['phone', 'email'] as const)('PATCH guarda %s vacío como null', async (field) => {
    const { app, store } = buildTestApp();
    const { id } = await createMember(app, {
      fullName: 'Ana',
      phone: '5551230000',
      email: 'ana@correo.com',
    });
    const response = await request(app)
      .patch(`/api/members/${id}`)
      .set(asSecretary)
      .send({ [field]: '' });
    expect(response.status).toBe(200);
    expect(store.members.get(id)?.[field]).toBeNull();
  });
});
