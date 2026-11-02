import { HttpError } from '../../errors.js';
import type {
  CreateDonationInput,
  Donation,
  DonationFilters,
  DonationList,
  DonationsRepository,
  DonationSummary,
  DonorRef,
  RangeSummary,
  SummaryGroup,
  SummaryRow,
  UpdateDonationInput,
} from './donations.types.js';

// Se suma en centavos para no acumular errores de punto flotante.
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

export function monthRange(month: string): { from: string; to: string } {
  const [yearText = '', monthText = ''] = month.split('-');
  const lastDay = new Date(Date.UTC(Number(yearText), Number(monthText), 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

function groupBy(rows: SummaryRow[], keyOf: (row: SummaryRow) => string | null): SummaryGroup[] {
  const groups = new Map<string, { cents: number; donations: number }>();
  for (const row of rows) {
    const key = keyOf(row);
    if (key === null) continue;
    const current = groups.get(key) ?? { cents: 0, donations: 0 };
    groups.set(key, {
      cents: current.cents + toCents(row.total),
      donations: current.donations + row.donations,
    });
  }
  return [...groups]
    .map(([key, value]) => ({ key, total: fromCents(value.cents), donations: value.donations }))
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

export class DonationsService {
  constructor(private readonly donations: DonationsRepository) {}

  async list(filters: DonationFilters): Promise<DonationList> {
    const donations = await this.donations.list(filters);
    const cents = donations.reduce((sum, donation) => sum + toCents(donation.amount), 0);
    return { donations, total: fromCents(cents) };
  }

  listDonors(): Promise<DonorRef[]> {
    return this.donations.listDonors();
  }

  create(input: CreateDonationInput): Promise<Donation> {
    return this.donations.create(input);
  }

  async update(id: string, patch: UpdateDonationInput): Promise<Donation> {
    const updated = await this.donations.update(id, patch);
    if (!updated) throw new HttpError(404, 'Donación no encontrada');
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!(await this.donations.remove(id))) throw new HttpError(404, 'Donación no encontrada');
  }

  // Total y desglose por método de cualquier rango (base del reporte de ingresos).
  async rangeSummary(from: string, to: string): Promise<RangeSummary> {
    const rows = await this.donations.summaryRows(from, to);
    const cents = rows.reduce((sum, row) => sum + toCents(row.total), 0);
    return {
      total: fromCents(cents),
      donations: rows.reduce((sum, row) => sum + row.donations, 0),
      byMethod: groupBy(rows, (row) => row.method),
    };
  }

  // Resumen mensual agregado: lo pueden ver también roles sin acceso a las filas (pastor).
  async summary(month: string): Promise<DonationSummary> {
    const range = monthRange(month);
    const rows = await this.donations.summaryRows(range.from, range.to);
    const cents = rows.reduce((sum, row) => sum + toCents(row.total), 0);
    return {
      month,
      ...range,
      total: fromCents(cents),
      donations: rows.reduce((sum, row) => sum + row.donations, 0),
      byMethod: groupBy(rows, (row) => row.method),
      // Si algún grupo llega sin concepto, el rol no puede verlos: no se inventa un desglose.
      byConcept: rows.some((row) => row.concept === null)
        ? null
        : groupBy(rows, (row) => row.concept),
    };
  }
}
