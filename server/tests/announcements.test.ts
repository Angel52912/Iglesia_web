import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authHeader, buildTestApp } from './helpers.js';

const admin = authHeader('admin');
const MISSING = '00000000-0000-4000-8000-0000000000ff';

interface AnnouncementBody {
  announcement: { id: string; title: string; body: string; important: boolean; publishedOn: string };
}

describe('API de comunicados', () => {
  it('publica un comunicado con valores por defecto y recorta espacios', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .post('/api/announcements')
      .set(admin)
      .send({ title: '  Culto especial ', body: ' Todos invitados ' });
    expect(response.status).toBe(201);
    const { announcement } = response.body as AnnouncementBody;
    expect(announcement).toMatchObject({
      title: 'Culto especial',
      body: 'Todos invitados',
      important: false,
    });
    expect(announcement.publishedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('acepta fecha de publicación e importante', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .post('/api/announcements')
      .set(admin)
      .send({ title: 'Aviso', body: 'Texto', important: true, publishedOn: '2026-11-10' });
    expect(response.status).toBe(201);
    expect((response.body as AnnouncementBody).announcement).toMatchObject({
      important: true,
      publishedOn: '2026-11-10',
    });
  });

  it.each([
    ['sin título', { body: 'Texto' }],
    ['título vacío', { title: '   ', body: 'Texto' }],
    ['sin mensaje', { title: 'Aviso' }],
    ['mensaje muy largo', { title: 'Aviso', body: 'x'.repeat(2001) }],
    ['fecha inválida', { title: 'Aviso', body: 'Texto', publishedOn: '2026-13-40' }],
    ['important no booleano', { title: 'Aviso', body: 'Texto', important: 'si' }],
  ])('rechaza con 400: %s', async (_name, payload) => {
    const { app, store } = buildTestApp();
    const response = await request(app).post('/api/announcements').set(admin).send(payload);
    expect(response.status).toBe(400);
    expect(store.announcements.size).toBe(0);
  });

  it('lista los más recientes primero y filtra por importantes', async () => {
    const { app } = buildTestApp();
    const post = (payload: object) => request(app).post('/api/announcements').set(admin).send(payload);
    await post({ title: 'Viejo', body: 'a', publishedOn: '2026-10-01' });
    await post({ title: 'Nuevo', body: 'b', important: true, publishedOn: '2026-11-01' });

    const all = await request(app).get('/api/announcements').set(admin);
    const titles = (all.body as { announcements: { title: string }[] }).announcements.map(
      (a) => a.title,
    );
    expect(titles).toEqual(['Nuevo', 'Viejo']);

    const important = await request(app).get('/api/announcements?important=true').set(admin);
    expect(
      (important.body as { announcements: { title: string }[] }).announcements.map((a) => a.title),
    ).toEqual(['Nuevo']);

    const invalid = await request(app).get('/api/announcements?important=quizas').set(admin);
    expect(invalid.status).toBe(400);
  });

  it('edita solo los campos enviados', async () => {
    const { app } = buildTestApp();
    const created = await request(app)
      .post('/api/announcements')
      .set(admin)
      .send({ title: 'Aviso', body: 'Texto' });
    const { id } = (created.body as AnnouncementBody).announcement;
    const response = await request(app)
      .patch(`/api/announcements/${id}`)
      .set(admin)
      .send({ important: true });
    expect(response.status).toBe(200);
    expect((response.body as AnnouncementBody).announcement).toMatchObject({
      title: 'Aviso',
      body: 'Texto',
      important: true,
    });
  });

  it('rechaza una edición vacía con 400', async () => {
    const { app } = buildTestApp();
    const response = await request(app).patch(`/api/announcements/${MISSING}`).set(admin).send({});
    expect(response.status).toBe(400);
  });

  it('responde 404 al editar o eliminar un comunicado que no existe', async () => {
    const { app } = buildTestApp();
    const patch = await request(app)
      .patch(`/api/announcements/${MISSING}`)
      .set(admin)
      .send({ title: 'X' });
    expect(patch.status).toBe(404);
    const removed = await request(app).delete(`/api/announcements/${MISSING}`).set(admin);
    expect(removed.status).toBe(404);
  });

  it('responde 400 con un identificador que no es UUID', async () => {
    const { app } = buildTestApp();
    const response = await request(app).delete('/api/announcements/abc').set(admin);
    expect(response.status).toBe(400);
  });
});
