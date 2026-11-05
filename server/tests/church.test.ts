import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ROLES } from '../src/types/auth.js';
import { authHeader, buildTestApp } from './helpers.js';

describe('GET /api/church', () => {
  it('responde 401 sin token', async () => {
    const { app } = buildTestApp();
    expect((await request(app).get('/api/church')).status).toBe(401);
  });

  it.each(ROLES)('%s ve nombre, logotipo, dirección y correo', async (role) => {
    const { app, store } = buildTestApp();
    store.settings = {
      ...store.settings,
      name: 'Iglesia Central',
      address: 'Calle 1',
      email: 'contacto@iglesia.test',
      phone: '5551234567',
      logoUrl: 'https://storage.test/logo-1',
    };
    const response = await request(app).get('/api/church').set(authHeader(role));
    expect(response.status).toBe(200);
    // El teléfono y los horarios no se exponen fuera de Configuración.
    expect(response.body).toEqual({
      church: {
        name: 'Iglesia Central',
        address: 'Calle 1',
        email: 'contacto@iglesia.test',
        logoUrl: 'https://storage.test/logo-1',
      },
    });
  });
});
