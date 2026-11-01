import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { AppRole } from '../src/types/auth.js';
import { authHeader, buildTestApp } from './helpers.js';

const DENIED: AppRole[] = ['pastor', 'secretary', 'treasurer', 'coordinator'];
const ID = '00000000-0000-4000-8000-0000000000ff';

describe('permisos de /api/settings (solo administrador)', () => {
  it('responde 401 sin token en cada endpoint', async () => {
    const { app } = buildTestApp();
    expect((await request(app).get('/api/settings')).status).toBe(401);
    expect((await request(app).patch('/api/settings').send({ name: 'X' })).status).toBe(401);
    expect((await request(app).put('/api/settings/logo')).status).toBe(401);
    expect((await request(app).delete('/api/settings/logo')).status).toBe(401);
    expect((await request(app).post('/api/settings/schedules').send({})).status).toBe(401);
    expect((await request(app).patch(`/api/settings/schedules/${ID}`).send({})).status).toBe(401);
    expect((await request(app).delete(`/api/settings/schedules/${ID}`)).status).toBe(401);
  });

  it('el administrador puede consultar y modificar', async () => {
    const { app } = buildTestApp();
    const asAdmin = authHeader('admin');
    expect((await request(app).get('/api/settings').set(asAdmin)).status).toBe(200);
    const patch = await request(app).patch('/api/settings').set(asAdmin).send({ name: 'Nueva' });
    expect(patch.status).toBe(200);
  });

  describe.each(DENIED)('rol %s', (role) => {
    it('recibe 403 en cada endpoint y no se cambia nada', async () => {
      const { app, store } = buildTestApp();
      const headers = authHeader(role);
      expect((await request(app).get('/api/settings').set(headers)).status).toBe(403);
      const patch = await request(app).patch('/api/settings').set(headers).send({ name: 'Otra' });
      expect(patch.status).toBe(403);
      const logo = await request(app)
        .put('/api/settings/logo')
        .set(headers)
        .set('Content-Type', 'image/png')
        .send(Buffer.from('89504e47', 'hex'));
      expect(logo.status).toBe(403);
      expect((await request(app).delete('/api/settings/logo').set(headers)).status).toBe(403);
      const schedule = await request(app)
        .post('/api/settings/schedules')
        .set(headers)
        .send({ label: 'Culto', weekday: 0, startTime: '10:00' });
      expect(schedule.status).toBe(403);
      const edit = await request(app).patch(`/api/settings/schedules/${ID}`).set(headers).send({});
      expect(edit.status).toBe(403);
      const remove = await request(app).delete(`/api/settings/schedules/${ID}`).set(headers);
      expect(remove.status).toBe(403);

      expect(store.settings.name).toBe('Mi iglesia');
      expect(store.settings.schedules).toHaveLength(0);
      expect(store.logos).toHaveLength(0);
    });
  });
});
