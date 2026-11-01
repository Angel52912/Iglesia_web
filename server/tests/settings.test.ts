import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authHeader, buildTestApp } from './helpers.js';

const asAdmin = authHeader('admin');
const PNG = Buffer.from('89504e470d0a1a0a', 'hex');

describe('GET /api/settings', () => {
  it('devuelve la configuración con sus horarios', async () => {
    const { app } = buildTestApp();
    const response = await request(app).get('/api/settings').set(asAdmin);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ settings: { name: 'Mi iglesia', schedules: [] } });
  });
});

describe('PATCH /api/settings', () => {
  it('actualiza nombre, dirección y contacto normalizando los datos', async () => {
    const { app } = buildTestApp();
    const response = await request(app).patch('/api/settings').set(asAdmin).send({
      name: '  Iglesia Central ',
      address: 'Calle 1 #23',
      phone: '555 123 4567',
      email: 'Contacto@Iglesia.com',
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      settings: {
        name: 'Iglesia Central',
        address: 'Calle 1 #23',
        phone: '555 123 4567',
        email: 'contacto@iglesia.com',
      },
    });
  });

  it('cadena vacía o solo espacios guarda null en dirección, teléfono y correo', async () => {
    const { app } = buildTestApp();
    await request(app)
      .patch('/api/settings')
      .set(asAdmin)
      .send({ address: 'Calle 1', phone: '555 1', email: 'a@b.com' });
    const response = await request(app)
      .patch('/api/settings')
      .set(asAdmin)
      .send({ address: '', phone: '  ', email: '' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      settings: { address: null, phone: null, email: null },
    });
  });

  it.each([
    ['nombre vacío', { name: '   ' }],
    ['correo inválido', { email: 'no-es-correo' }],
    ['teléfono inválido', { phone: 'abc' }],
    ['sin cambios', {}],
  ])('rechaza con 400: %s', async (_caso, body) => {
    const { app } = buildTestApp();
    const response = await request(app).patch('/api/settings').set(asAdmin).send(body);
    expect(response.status).toBe(400);
  });
});

describe('logotipo', () => {
  it('sube un PNG y devuelve su URL', async () => {
    const { app, store } = buildTestApp();
    const response = await request(app)
      .put('/api/settings/logo')
      .set(asAdmin)
      .set('Content-Type', 'image/png')
      .send(PNG);
    expect(response.status).toBe(200);
    expect(store.settings.logoUrl).not.toBeNull();
    expect(store.logos).toHaveLength(1);
    expect(store.logos[0]?.contentType).toBe('image/png');
  });

  it('rechaza con 415 un tipo que no es imagen permitida', async () => {
    const { app, store } = buildTestApp();
    const response = await request(app)
      .put('/api/settings/logo')
      .set(asAdmin)
      .set('Content-Type', 'application/pdf')
      .send(PNG);
    expect(response.status).toBe(415);
    expect(store.logos).toHaveLength(0);
  });

  it.each([
    ['image/jpeg', Buffer.from('ffd8ffe000104a46', 'hex')],
    ['image/webp', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')])],
  ])('acepta %s con firma válida', async (type, bytes) => {
    const { app, store } = buildTestApp();
    const response = await request(app)
      .put('/api/settings/logo')
      .set(asAdmin)
      .set('Content-Type', type)
      .send(bytes);
    expect(response.status).toBe(200);
    expect(store.logos[0]?.contentType).toBe(type);
  });

  it.each([
    ['texto con Content-Type image/png', 'image/png', Buffer.from('<script>alert(1)</script>')],
    ['JPEG declarado como PNG', 'image/png', Buffer.from('ffd8ffe000104a46', 'hex')],
    ['PNG declarado como WebP', 'image/webp', Buffer.from('89504e470d0a1a0a', 'hex')],
    [
      'RIFF que no es WebP',
      'image/webp',
      Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEfmt ')]),
    ],
  ])('rechaza con 415 por firma incorrecta: %s', async (_caso, type, bytes) => {
    const { app, store } = buildTestApp();
    const response = await request(app)
      .put('/api/settings/logo')
      .set(asAdmin)
      .set('Content-Type', type)
      .send(bytes);
    expect(response.status).toBe(415);
    expect(store.logos).toHaveLength(0);
  });

  it('rechaza con 400 un cuerpo vacío', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .put('/api/settings/logo')
      .set(asAdmin)
      .set('Content-Type', 'image/png')
      .send(Buffer.alloc(0));
    expect(response.status).toBe(400);
  });

  it('rechaza con 413 una imagen de más de 1 MB', async () => {
    const { app, store } = buildTestApp();
    const response = await request(app)
      .put('/api/settings/logo')
      .set(asAdmin)
      .set('Content-Type', 'image/png')
      .send(Buffer.alloc(1024 * 1024 + 1));
    expect(response.status).toBe(413);
    expect(store.logos).toHaveLength(0);
  });

  it('quita el logotipo', async () => {
    const { app } = buildTestApp();
    await request(app)
      .put('/api/settings/logo')
      .set(asAdmin)
      .set('Content-Type', 'image/png')
      .send(PNG);
    const response = await request(app).delete('/api/settings/logo').set(asAdmin);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ settings: { logoUrl: null } });
  });
});

describe('horarios de reunión', () => {
  const schedule = { label: 'Culto dominical', weekday: 0, startTime: '10:00' };
  const missingId = '00000000-0000-4000-8000-0000000000ff';

  it('crea, edita y elimina un horario', async () => {
    const { app } = buildTestApp();
    const created = await request(app).post('/api/settings/schedules').set(asAdmin).send(schedule);
    expect(created.status).toBe(201);
    const { id } = (created.body as { schedule: { id: string } }).schedule;

    const updated = await request(app)
      .patch(`/api/settings/schedules/${id}`)
      .set(asAdmin)
      .send({ startTime: '11:30' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      schedule: { label: 'Culto dominical', startTime: '11:30' },
    });

    const listed = await request(app).get('/api/settings').set(asAdmin);
    expect(listed.body).toMatchObject({ settings: { schedules: [{ id }] } });

    const removed = await request(app).delete(`/api/settings/schedules/${id}`).set(asAdmin);
    expect(removed.status).toBe(204);
    const after = await request(app).get('/api/settings').set(asAdmin);
    expect(after.body).toMatchObject({ settings: { schedules: [] } });
  });

  it.each([
    ['día fuera de rango', { ...schedule, weekday: 7 }],
    ['hora inválida', { ...schedule, startTime: '25:00' }],
    ['sin descripción', { ...schedule, label: ' ' }],
  ])('rechaza con 400: %s', async (_caso, body) => {
    const { app } = buildTestApp();
    const response = await request(app).post('/api/settings/schedules').set(asAdmin).send(body);
    expect(response.status).toBe(400);
  });

  it('responde 404 al editar o borrar un horario que no existe', async () => {
    const { app } = buildTestApp();
    const patch = await request(app)
      .patch(`/api/settings/schedules/${missingId}`)
      .set(asAdmin)
      .send({ label: 'X' });
    expect(patch.status).toBe(404);
    const remove = await request(app).delete(`/api/settings/schedules/${missingId}`).set(asAdmin);
    expect(remove.status).toBe(404);
  });

  it('responde 400 con un id que no es UUID', async () => {
    const { app } = buildTestApp();
    const response = await request(app).delete('/api/settings/schedules/abc').set(asAdmin);
    expect(response.status).toBe(400);
  });
});
