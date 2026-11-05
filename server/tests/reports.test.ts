import type { EventEmitter } from 'node:events';
import request, { type Response } from 'supertest';
import { describe, expect, it } from 'vitest';
import { monthsBetween } from '../src/modules/reports/reports.service.js';
import type { ReportTable } from '../src/modules/reports/reports.types.js';
import { authHeader, buildTestApp, type TestContext } from './helpers.js';

const asSecretary = authHeader('secretary');
const asAdmin = authHeader('admin');

function binaryParser(
  res: EventEmitter,
  callback: (error: Error | null, body: Buffer) => void,
): void {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => {
    callback(null, Buffer.concat(chunks));
  });
}

function reportOf(response: Response): ReportTable {
  return (response.body as { report: ReportTable }).report;
}

async function seedMembers(app: TestContext['app']): Promise<void> {
  await request(app)
    .post('/api/members')
    .set(asSecretary)
    .send({ fullName: 'Ana Pérez', phone: '5551234567', email: 'ana@iglesia.test' });
  const luis = await request(app).post('/api/members').set(asSecretary).send({ fullName: 'Luis' });
  const id = (luis.body as { member: { id: string } }).member.id;
  await request(app).patch(`/api/members/${id}`).set(asSecretary).send({ active: false });
}

async function seedAttendance(app: TestContext['app']): Promise<void> {
  const members = await Promise.all(
    ['Ana', 'Luis', 'Eva', 'Raúl'].map(async (fullName) => {
      const response = await request(app).post('/api/members').set(asSecretary).send({ fullName });
      return (response.body as { member: { id: string } }).member.id;
    }),
  );
  const event = await request(app).post('/api/events').set(asSecretary).send({
    title: 'Culto dominical',
    eventDate: '2026-11-08',
    startTime: '10:00',
    type: 'religious',
    category: 'worship',
  });
  const eventId = (event.body as { event: { id: string } }).event.id;
  await request(app)
    .put(`/api/attendance/events/${eventId}`)
    .set(asSecretary)
    .send({ records: members.map((memberId, index) => ({ memberId, present: index < 3 })) });
}

describe('monthsBetween', () => {
  it('lista los meses que toca el periodo, cruzando de año', () => {
    expect(monthsBetween('2026-11-15', '2027-01-02')).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(monthsBetween('2026-11-01', '2026-11-30')).toEqual(['2026-11']);
  });
});

describe('GET /api/reports/members', () => {
  it('lista todos los miembros con su resumen', async () => {
    const { app } = buildTestApp();
    await seedMembers(app);
    const report = reportOf(await request(app).get('/api/reports/members').set(asAdmin));
    expect(report.rows).toHaveLength(2);
    expect(report.rows[0]).toContain('Ana Pérez');
    expect(report.summary).toEqual([
      { label: 'Total de miembros', value: '2' },
      { label: 'Activos', value: '1' },
      { label: 'Inactivos', value: '1' },
    ]);
  });

  it('filtra por estado', async () => {
    const { app } = buildTestApp();
    await seedMembers(app);
    const active = reportOf(
      await request(app).get('/api/reports/members?status=active').set(asAdmin),
    );
    const inactive = reportOf(
      await request(app).get('/api/reports/members?status=inactive').set(asAdmin),
    );
    expect(active.rows).toHaveLength(1);
    expect(inactive.rows[0]?.[0]).toBe('Luis');
  });

  it('rechaza un estado o formato no válido con 400', async () => {
    const { app } = buildTestApp();
    expect((await request(app).get('/api/reports/members?status=x').set(asAdmin)).status).toBe(400);
    expect((await request(app).get('/api/reports/members?format=doc').set(asAdmin)).status).toBe(
      400,
    );
  });
});

describe('GET /api/reports/attendance', () => {
  it('calcula presentes, ausentes y porcentaje por evento', async () => {
    const { app } = buildTestApp();
    await seedAttendance(app);
    const response = await request(app)
      .get('/api/reports/attendance?from=2026-11-01&to=2026-11-30')
      .set(asSecretary);
    const report = reportOf(response);
    expect(report.rows).toEqual([['Culto dominical', '08/11/2026', 3, 1, 75]]);
    expect(report.summary[0]).toEqual({ label: 'Eventos con asistencia', value: '1' });
  });

  it('excluye los eventos fuera del periodo', async () => {
    const { app } = buildTestApp();
    await seedAttendance(app);
    const response = await request(app)
      .get('/api/reports/attendance?from=2026-12-01&to=2026-12-31')
      .set(asSecretary);
    expect(reportOf(response).rows).toHaveLength(0);
  });

  it('exige un periodo válido', async () => {
    const { app } = buildTestApp();
    const get = (query: string): Promise<Response> =>
      request(app).get(`/api/reports/attendance${query}`).set(asSecretary);
    expect((await get('')).status).toBe(400);
    expect((await get('?from=2026-11-30&to=2026-11-01')).status).toBe(400);
    expect((await get('?from=2020-01-01&to=2026-11-01')).status).toBe(400);
    expect((await get('?from=ayer&to=hoy')).status).toBe(400);
  });
});

describe('GET /api/reports/ministries', () => {
  it('lista ministerios con coordinadores e integrantes', async () => {
    const { app } = buildTestApp();
    const created = await request(app)
      .post('/api/ministries')
      .set(authHeader('pastor'))
      .send({ name: 'Música' });
    expect(created.status).toBe(201);
    const report = reportOf(await request(app).get('/api/reports/ministries').set(asAdmin));
    expect(report.rows).toEqual([['Música', 'Activo', null, 0]]);
    expect(report.summary[0]).toEqual({ label: 'Ministerios', value: '1' });
  });
});

describe('GET /api/reports/income', () => {
  async function seedDonations(app: TestContext['app']): Promise<void> {
    const treasurer = authHeader('treasurer');
    for (const [donatedOn, amount, method] of [
      ['2026-10-20', 100, 'cash'],
      ['2026-11-02', 250.5, 'transfer'],
      ['2026-11-15', 49.5, 'cash'],
    ] as const) {
      await request(app)
        .post('/api/donations')
        .set(treasurer)
        .send({ donatedOn, amount, concept: 'Diezmo de Juan Pérez', method });
    }
  }

  it('agrupa por mes y resume por método, sin conceptos ni donantes', async () => {
    const { app } = buildTestApp();
    await seedDonations(app);
    const response = await request(app)
      .get('/api/reports/income?from=2026-10-01&to=2026-11-30')
      .set(authHeader('pastor'));
    const report = reportOf(response);
    expect(report.rows).toEqual([
      ['2026-10', 1, 100],
      ['2026-11', 2, 300],
    ]);
    expect(report.summary.map((line) => line.label)).toEqual([
      'Total de ingresos',
      'Donaciones registradas',
      // Por monto, de mayor a menor.
      'Transferencia',
      'Efectivo',
    ]);
    expect(JSON.stringify(response.body)).not.toContain('Juan');
  });

  it('recorta el primer y último mes al periodo pedido', async () => {
    const { app } = buildTestApp();
    await seedDonations(app);
    const response = await request(app)
      .get('/api/reports/income?from=2026-11-10&to=2026-11-30')
      .set(authHeader('treasurer'));
    expect(reportOf(response).rows).toEqual([['2026-11', 1, 49.5]]);
  });
});

describe('exportación', () => {
  it('genera un PDF descargable', async () => {
    const { app } = buildTestApp();
    await seedMembers(app);
    const response = await request(app)
      .get('/api/reports/members?format=pdf')
      .set(asAdmin)
      .buffer(true)
      .parse(binaryParser);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toMatch(
      /attachment; filename="reporte-miembros-.*\.pdf"/,
    );
    expect((response.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('genera un archivo de Excel', async () => {
    const { app } = buildTestApp();
    await seedAttendance(app);
    const response = await request(app)
      .get('/api/reports/attendance?from=2026-11-01&to=2026-11-30&format=xlsx')
      .set(asSecretary)
      .buffer(true)
      .parse(binaryParser);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
    // Un .xlsx es un zip: empieza con "PK".
    expect((response.body as Buffer).subarray(0, 2).toString()).toBe('PK');
  });

  it('exporta aunque el reporte esté vacío', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .get('/api/reports/members?format=pdf')
      .set(asAdmin)
      .buffer(true)
      .parse(binaryParser);
    expect(response.status).toBe(200);
  });
});
