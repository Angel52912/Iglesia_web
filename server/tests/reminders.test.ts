import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ResendEmailSender } from '../src/modules/reminders/resendEmailSender.js';
import type { AppRole } from '../src/types/auth.js';
import { authHeader, buildTestApp, type TestContext } from './helpers.js';

const CAN_REMIND: AppRole[] = ['admin', 'pastor', 'secretary'];
const CANNOT_REMIND: AppRole[] = ['treasurer', 'coordinator'];
const MISSING_ID = '00000000-0000-4000-8000-0000000000ff';

async function seedEvent(ctx: TestContext): Promise<string> {
  const admin = authHeader('admin');
  const ana = await request(ctx.app)
    .post('/api/members')
    .set(admin)
    .send({ fullName: 'Ana', email: 'ana@iglesia.test' });
  const luis = await request(ctx.app).post('/api/members').set(admin).send({ fullName: 'Luis' });
  const created = await request(ctx.app)
    .post('/api/events')
    .set(admin)
    .send({
      title: 'Culto dominical',
      eventDate: '2026-11-08',
      startTime: '10:00',
      type: 'religious',
      category: 'worship',
      location: 'Templo',
      responsibleIds: [
        (ana.body as { member: { id: string } }).member.id,
        (luis.body as { member: { id: string } }).member.id,
      ],
    });
  return (created.body as { event: { id: string } }).event.id;
}

describe('POST /api/reminders/events/:id', () => {
  it('responde 401 sin token', async () => {
    const { app } = buildTestApp();
    expect((await request(app).post(`/api/reminders/events/${MISSING_ID}`)).status).toBe(401);
  });

  it.each(CAN_REMIND)('%s puede enviar recordatorios', async (role) => {
    const ctx = buildTestApp();
    const id = await seedEvent(ctx);
    const response = await request(ctx.app)
      .post(`/api/reminders/events/${id}`)
      .set(authHeader(role));
    expect(response.status).toBe(200);
    expect(ctx.store.emails).toHaveLength(1);
  });

  it.each(CANNOT_REMIND)('%s recibe 403 y no se envía nada', async (role) => {
    const ctx = buildTestApp();
    const id = await seedEvent(ctx);
    const response = await request(ctx.app)
      .post(`/api/reminders/events/${id}`)
      .set(authHeader(role));
    expect(response.status).toBe(403);
    expect(ctx.store.emails).toHaveLength(0);
  });

  it('envía solo a responsables con correo y cuenta los que no tienen', async () => {
    const ctx = buildTestApp();
    const id = await seedEvent(ctx);
    const response = await request(ctx.app)
      .post(`/api/reminders/events/${id}`)
      .set(authHeader('secretary'));
    expect(response.body).toEqual({ sent: 1, withoutEmail: 1, failed: 0 });
    expect(ctx.store.emails[0]).toMatchObject({
      to: 'ana@iglesia.test',
      subject: 'Recordatorio: Culto dominical',
    });
    expect(ctx.store.emails[0]?.text).toContain('2026-11-08');
  });

  it('cuenta los envíos rechazados por la API de correo', async () => {
    const ctx = buildTestApp();
    const id = await seedEvent(ctx);
    ctx.store.failEmailTo.add('ana@iglesia.test');
    const response = await request(ctx.app)
      .post(`/api/reminders/events/${id}`)
      .set(authHeader('admin'));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ sent: 0, withoutEmail: 1, failed: 1 });
  });

  it('responde 404 si el evento no existe', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .post(`/api/reminders/events/${MISSING_ID}`)
      .set(authHeader('admin'));
    expect(response.status).toBe(404);
  });

  it('responde 409 si el evento está cancelado', async () => {
    const ctx = buildTestApp();
    const id = await seedEvent(ctx);
    await request(ctx.app)
      .patch(`/api/events/${id}`)
      .set(authHeader('admin'))
      .send({ status: 'cancelled' });
    const response = await request(ctx.app)
      .post(`/api/reminders/events/${id}`)
      .set(authHeader('admin'));
    expect(response.status).toBe(409);
    expect(ctx.store.emails).toHaveLength(0);
  });

  it('responde 400 con un id inválido', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .post('/api/reminders/events/no-es-uuid')
      .set(authHeader('admin'));
    expect(response.status).toBe(400);
  });
});

describe('ResendEmailSender', () => {
  it('envía a la API de Resend con la llave y un solo destinatario', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fakeFetch: typeof fetch = (url, init) => {
      const target = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      calls.push({ url: target, init: init ?? {} });
      return Promise.resolve(new Response('{}', { status: 200 }));
    };
    const sender = new ResendEmailSender('re_key', 'Iglesia <a@b.c>', fakeFetch);
    await sender.send({ to: 'ana@iglesia.test', subject: 'Hola', text: 'Texto' });

    expect(calls[0]?.url).toBe('https://api.resend.com/emails');
    expect((calls[0]?.init.headers as Record<string, string>).Authorization).toBe(
      'Bearer re_key',
    );
    const body = calls[0]?.init.body;
    expect(JSON.parse(typeof body === 'string' ? body : '{}')).toMatchObject({
      to: ['ana@iglesia.test'],
    });
  });

  it('lanza error si la API responde con fallo', async () => {
    const fakeFetch: typeof fetch = () =>
      Promise.resolve(new Response('{}', { status: 422 }));
    const sender = new ResendEmailSender('k', 'f', fakeFetch);
    await expect(sender.send({ to: 'a@b.c', subject: 's', text: 't' })).rejects.toThrow('422');
  });
});
