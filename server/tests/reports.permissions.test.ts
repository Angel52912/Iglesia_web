import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ROLES, type AppRole } from '../src/types/auth.js';
import { authHeader, buildTestApp } from './helpers.js';

const PERIOD = 'from=2026-11-01&to=2026-11-30';

// Matriz de CLAUDE.md. El coordinador (su ministerio) queda pendiente: sin vínculo cuenta-ministerio.
const REPORTS: { path: string; allowed: AppRole[] }[] = [
  { path: '/api/reports/members', allowed: ['admin', 'pastor', 'secretary'] },
  { path: `/api/reports/attendance?${PERIOD}`, allowed: ['admin', 'pastor', 'secretary'] },
  { path: '/api/reports/ministries', allowed: ['admin', 'pastor'] },
  { path: `/api/reports/income?${PERIOD}`, allowed: ['admin', 'pastor', 'treasurer'] },
];

describe.each(REPORTS)('permisos de $path', ({ path, allowed }) => {
  it('responde 401 sin token', async () => {
    const { app } = buildTestApp();
    expect((await request(app).get(path)).status).toBe(401);
  });

  it.each(allowed)('%s puede consultarlo', async (role) => {
    const { app } = buildTestApp();
    expect((await request(app).get(path).set(authHeader(role))).status).toBe(200);
  });

  it.each(allowed)('%s puede exportarlo a PDF', async (role) => {
    const { app } = buildTestApp();
    const separator = path.includes('?') ? '&' : '?';
    const response = await request(app).get(`${path}${separator}format=pdf`).set(authHeader(role));
    expect(response.status).toBe(200);
  });

  it.each(ROLES.filter((role) => !allowed.includes(role)))('%s recibe 403', async (role) => {
    const { app } = buildTestApp();
    const separator = path.includes('?') ? '&' : '?';
    for (const format of ['json', 'pdf', 'xlsx']) {
      const response = await request(app)
        .get(`${path}${separator}format=${format}`)
        .set(authHeader(role));
      expect(response.status).toBe(403);
    }
  });
});
