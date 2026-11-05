import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ROLE_IDS, authHeader, buildTestApp } from './helpers.js';

const PASSWORD = 'ClaveSegura123';

const validUser = {
  email: 'nuevo@iglesia.test',
  password: PASSWORD,
  fullName: 'Nuevo Usuario',
  role: 'secretary',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/users', () => {
  it('crea el usuario con 201 y nunca devuelve la contraseña', async () => {
    const { app } = buildTestApp();
    const response = await request(app).post('/api/users').set(authHeader('admin')).send(validUser);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      user: {
        email: 'nuevo@iglesia.test',
        fullName: 'Nuevo Usuario',
        role: 'secretary',
        active: true,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain(PASSWORD);
    expect(response.body).not.toHaveProperty('user.password');
  });

  it('guarda el correo en minúsculas', async () => {
    const { app, store } = buildTestApp();
    const response = await request(app)
      .post('/api/users')
      .set(authHeader('admin'))
      .send({ ...validUser, email: 'Nuevo.Usuario@Iglesia.TEST' });

    expect(response.status).toBe(201);
    expect(store.createCalls[0]?.email).toBe('nuevo.usuario@iglesia.test');
  });

  it('responde 409 si el correo ya existe, sin distinguir mayúsculas', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .post('/api/users')
      .set(authHeader('admin'))
      .send({ ...validUser, email: 'PASTOR@iglesia.test' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Ya existe un usuario con ese correo' });
  });

  it('rechaza contraseñas de menos de 8 caracteres con 400', async () => {
    const { app, store } = buildTestApp();
    const response = await request(app)
      .post('/api/users')
      .set(authHeader('admin'))
      .send({ ...validUser, password: '1234567' });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toContain('al menos 8 caracteres');
    expect(JSON.stringify(response.body)).not.toContain('1234567');
    expect(store.createCalls).toHaveLength(0);
  });

  it.each([
    ['correo inválido', { email: 'no-es-correo' }],
    ['rol inexistente', { role: 'superusuario' }],
    ['nombre vacío', { fullName: '   ' }],
    ['nombre con números', { fullName: 'Admin 2' }],
    ['contraseña ausente', { password: undefined }],
  ])('rechaza con 400: %s', async (_caso, override) => {
    const { app, store } = buildTestApp();
    const response = await request(app)
      .post('/api/users')
      .set(authHeader('admin'))
      .send({ ...validUser, ...override });

    expect(response.status).toBe(400);
    expect(store.createCalls).toHaveLength(0);
  });

  it('responde 400 con un JSON mal formado', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .post('/api/users')
      .set(authHeader('admin'))
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(response.status).toBe(400);
  });

  it('no registra la contraseña en los logs cuando falla con 500', async () => {
    const { app, store } = buildTestApp();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    store.failNextCreate = new Error('fallo de Auth');

    const response = await request(app).post('/api/users').set(authHeader('admin')).send(validUser);

    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain(PASSWORD);
    expect(JSON.stringify(spy.mock.calls)).not.toContain(PASSWORD);
  });
});

describe('PATCH /api/users/:id', () => {
  it('actualiza el nombre y sincroniza el rol en Auth', async () => {
    const { app, store } = buildTestApp();
    const response = await request(app)
      .patch(`/api/users/${ROLE_IDS.pastor}`)
      .set(authHeader('admin'))
      .send({ fullName: 'Pastor Nuevo', role: 'secretary' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ user: { fullName: 'Pastor Nuevo', role: 'secretary' } });
    expect(store.authRoles.get(ROLE_IDS.pastor)).toBe('secretary');
  });

  it('al desactivar bloquea al usuario en Auth y al reactivar lo desbloquea', async () => {
    const { app, store } = buildTestApp();
    const id = ROLE_IDS.coordinator;

    await request(app).patch(`/api/users/${id}`).set(authHeader('admin')).send({ active: false });
    expect(store.profiles.get(id)?.active).toBe(false);
    expect(store.blocked.has(id)).toBe(true);

    await request(app).patch(`/api/users/${id}`).set(authHeader('admin')).send({ active: true });
    expect(store.profiles.get(id)?.active).toBe(true);
    expect(store.blocked.has(id)).toBe(false);
  });

  it('un administrador no puede desactivarse a sí mismo', async () => {
    const { app, store } = buildTestApp();
    const response = await request(app)
      .patch(`/api/users/${ROLE_IDS.admin}`)
      .set(authHeader('admin'))
      .send({ active: false });

    expect(response.status).toBe(409);
    expect(store.profiles.get(ROLE_IDS.admin)?.active).toBe(true);
    expect(store.blocked.has(ROLE_IDS.admin)).toBe(false);
  });

  it('un administrador no puede cambiarse su propio rol', async () => {
    const { app, store } = buildTestApp();
    const response = await request(app)
      .patch(`/api/users/${ROLE_IDS.admin}`)
      .set(authHeader('admin'))
      .send({ role: 'pastor' });

    expect(response.status).toBe(409);
    expect(store.profiles.get(ROLE_IDS.admin)?.role).toBe('admin');
  });

  it('un administrador sí puede editar su propio nombre', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .patch(`/api/users/${ROLE_IDS.admin}`)
      .set(authHeader('admin'))
      .send({ fullName: 'Admin Renombrado', role: 'admin' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ user: { fullName: 'Admin Renombrado' } });
  });

  it('responde 404 si el usuario no existe', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .patch('/api/users/00000000-0000-4000-8000-0000000000ff')
      .set(authHeader('admin'))
      .send({ fullName: 'X' });

    expect(response.status).toBe(404);
  });

  it.each([
    ['id que no es uuid', '/api/users/123', { fullName: 'X' }],
    ['cuerpo vacío', `/api/users/${ROLE_IDS.pastor}`, {}],
    ['rol inexistente', `/api/users/${ROLE_IDS.pastor}`, { role: 'dios' }],
    ['active no booleano', `/api/users/${ROLE_IDS.pastor}`, { active: 'no' }],
  ])('responde 400: %s', async (_caso, path, body) => {
    const { app } = buildTestApp();
    const response = await request(app).patch(path).set(authHeader('admin')).send(body);
    expect(response.status).toBe(400);
  });
});
