import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { monthRange } from '../src/modules/donations/donations.service.js';
import { authHeader, buildTestApp, idFor } from './helpers.js';

const treasurer = authHeader('treasurer');
const base = { donatedOn: '2026-11-01', amount: 100, concept: 'Diezmo', method: 'cash' };

interface DonationBody {
  id: string;
  memberId: string | null;
  donorName: string | null;
  amount: number;
  concept: string;
}

describe('/api/donations', () => {
  it('registra una donación anónima sin miembro', async () => {
    const { app } = buildTestApp();
    const response = await request(app).post('/api/donations').set(treasurer).send(base);
    expect(response.status).toBe(201);
    const { donation } = response.body as { donation: DonationBody };
    expect(donation.memberId).toBeNull();
    expect(donation.donorName).toBeNull();
  });

  it('asocia la donación a un miembro y muestra su nombre', async () => {
    const { app } = buildTestApp();
    const member = await request(app)
      .post('/api/members')
      .set(authHeader('admin'))
      .send({ fullName: 'Ana Pérez' });
    const { id: memberId } = (member.body as { member: { id: string } }).member;
    const response = await request(app)
      .post('/api/donations')
      .set(treasurer)
      .send({ ...base, memberId });
    expect(response.status).toBe(201);
    expect((response.body as { donation: DonationBody }).donation.donorName).toBe('Ana Pérez');

    const donors = await request(app).get('/api/donations/donors').set(treasurer);
    expect((donors.body as { donors: unknown[] }).donors).toEqual([
      { id: memberId, fullName: 'Ana Pérez' },
    ]);
  });

  it('responde 400 si el miembro no existe', async () => {
    const { app, store } = buildTestApp();
    const response = await request(app)
      .post('/api/donations')
      .set(treasurer)
      .send({ ...base, memberId: idFor(999) });
    expect(response.status).toBe(400);
    expect(store.donations.size).toBe(0);
  });

  it.each([
    ['monto cero', { amount: 0 }],
    ['monto negativo', { amount: -5 }],
    ['monto con 3 decimales', { amount: 10.123 }],
    ['monto como texto', { amount: '10' }],
    ['monto fuera de rango', { amount: 1e12 }],
    ['concepto vacío', { concept: '   ' }],
    ['método inválido', { method: 'bitcoin' }],
    ['fecha inválida', { donatedOn: '2026-13-40' }],
    ['miembro no válido', { memberId: 'abc' }],
  ])('rechaza %s con 400', async (_name, override) => {
    const { app, store } = buildTestApp();
    const response = await request(app)
      .post('/api/donations')
      .set(treasurer)
      .send({ ...base, ...override });
    expect(response.status).toBe(400);
    expect(store.donations.size).toBe(0);
  });

  it('lista por periodo con el total exacto en centavos', async () => {
    const { app } = buildTestApp();
    for (const [donatedOn, amount] of [
      ['2026-10-31', 999],
      ['2026-11-02', 0.1],
      ['2026-11-03', 0.2],
    ] as const) {
      await request(app).post('/api/donations').set(treasurer).send({ ...base, donatedOn, amount });
    }
    const response = await request(app)
      .get('/api/donations?from=2026-11-01&to=2026-11-30')
      .set(treasurer);
    const body = response.body as { donations: DonationBody[]; total: number };
    expect(body.donations).toHaveLength(2);
    expect(body.total).toBe(0.3);
  });

  it('rechaza un periodo con fechas invertidas', async () => {
    const { app } = buildTestApp();
    const response = await request(app)
      .get('/api/donations?from=2026-12-01&to=2026-11-01')
      .set(treasurer);
    expect(response.status).toBe(400);
  });

  it('edita una donación y puede volverla anónima', async () => {
    const { app } = buildTestApp();
    const member = await request(app)
      .post('/api/members')
      .set(authHeader('admin'))
      .send({ fullName: 'Ana Pérez' });
    const { id: memberId } = (member.body as { member: { id: string } }).member;
    const created = await request(app)
      .post('/api/donations')
      .set(treasurer)
      .send({ ...base, memberId });
    const { id } = (created.body as { donation: DonationBody }).donation;

    const response = await request(app)
      .patch(`/api/donations/${id}`)
      .set(treasurer)
      .send({ memberId: null, concept: 'Ofrenda' });
    const { donation } = response.body as { donation: DonationBody };
    expect(donation.memberId).toBeNull();
    expect(donation.concept).toBe('Ofrenda');
  });

  it('rechaza una edición vacía con 400 y una inexistente con 404', async () => {
    const { app } = buildTestApp();
    expect((await request(app).patch(`/api/donations/${idFor(9)}`).set(treasurer).send({})).status)
      .toBe(400);
    const missing = await request(app)
      .patch(`/api/donations/${idFor(9)}`)
      .set(treasurer)
      .send({ amount: 5 });
    expect(missing.status).toBe(404);
  });

  it('elimina una donación y responde 404 si ya no existe', async () => {
    const { app, store } = buildTestApp();
    const created = await request(app).post('/api/donations').set(treasurer).send(base);
    const { id } = (created.body as { donation: DonationBody }).donation;
    expect((await request(app).delete(`/api/donations/${id}`).set(treasurer)).status).toBe(204);
    expect(store.donations.size).toBe(0);
    expect((await request(app).delete(`/api/donations/${id}`).set(treasurer)).status).toBe(404);
  });

  describe('resumen mensual', () => {
    it('agrupa por método y concepto solo del mes pedido', async () => {
      const { app } = buildTestApp();
      const entries = [
        { donatedOn: '2026-11-01', amount: 100, concept: 'Diezmo', method: 'cash' },
        { donatedOn: '2026-11-30', amount: 50.25, concept: 'Diezmo', method: 'transfer' },
        { donatedOn: '2026-11-15', amount: 20, concept: 'Ofrenda', method: 'cash' },
        { donatedOn: '2026-12-01', amount: 999, concept: 'Diezmo', method: 'cash' },
        { donatedOn: '2026-10-31', amount: 999, concept: 'Diezmo', method: 'cash' },
      ];
      for (const entry of entries) {
        await request(app).post('/api/donations').set(treasurer).send(entry);
      }
      const response = await request(app)
        .get('/api/donations/summary?month=2026-11')
        .set(authHeader('pastor'));
      expect(response.status).toBe(200);
      expect((response.body as { summary: unknown }).summary).toEqual({
        month: '2026-11',
        from: '2026-11-01',
        to: '2026-11-30',
        total: 170.25,
        donations: 3,
        byMethod: [
          { key: 'cash', total: 120, donations: 2 },
          { key: 'transfer', total: 50.25, donations: 1 },
        ],
        byConcept: [
          { key: 'Diezmo', total: 150.25, donations: 2 },
          { key: 'Ofrenda', total: 20, donations: 1 },
        ],
      });
    });

    it('un mes sin donaciones devuelve ceros', async () => {
      const { app } = buildTestApp();
      const response = await request(app)
        .get('/api/donations/summary?month=2026-02')
        .set(treasurer);
      const { summary } = response.body as { summary: { total: number; to: string } };
      expect(summary.total).toBe(0);
      expect(summary.to).toBe('2026-02-28');
    });

    it.each(['2026-13', '2026-1', 'noviembre', ''])('rechaza el mes "%s" con 400', async (month) => {
      const { app } = buildTestApp();
      const response = await request(app)
        .get(`/api/donations/summary?month=${month}`)
        .set(treasurer);
      expect(response.status).toBe(400);
    });

    it('monthRange maneja febrero bisiesto y diciembre', () => {
      expect(monthRange('2028-02').to).toBe('2028-02-29');
      expect(monthRange('2026-12')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
    });
  });
});
