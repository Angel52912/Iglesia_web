import { apiRequest } from '../../lib/apiClient';

export const DONATION_METHODS = ['cash', 'transfer', 'card', 'check', 'other'] as const;

export type DonationMethod = (typeof DONATION_METHODS)[number];

export const METHOD_LABELS: Record<DonationMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  check: 'Cheque',
  other: 'Otro',
};

export interface Donation {
  id: string;
  // null = donación anónima.
  memberId: string | null;
  donorName: string | null;
  donatedOn: string;
  amount: number;
  concept: string;
  method: DonationMethod;
}

export interface Donor {
  id: string;
  fullName: string;
}

export interface DonationList {
  donations: Donation[];
  total: number;
}

export interface SummaryGroup {
  key: string;
  total: number;
  donations: number;
}

export interface DonationSummary {
  month: string;
  from: string;
  to: string;
  total: number;
  donations: number;
  byMethod: SummaryGroup[];
  // null para el pastor: no ve conceptos.
  byConcept: SummaryGroup[] | null;
}

export interface DonationPayload {
  memberId: string | null;
  donatedOn: string;
  amount: number;
  concept: string;
  method: DonationMethod;
}

// "2026-11" -> primer y último día del mes.
export function monthBounds(month: string): { from: string; to: string } {
  const [year = 0, monthNumber = 0] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

export function listDonations(month: string): Promise<DonationList> {
  const { from, to } = monthBounds(month);
  return apiRequest<DonationList>(`/api/donations?from=${from}&to=${to}`);
}

export async function listDonors(): Promise<Donor[]> {
  const { donors } = await apiRequest<{ donors: Donor[] }>('/api/donations/donors');
  return donors;
}

export async function getDonationSummary(month: string): Promise<DonationSummary> {
  const { summary } = await apiRequest<{ summary: DonationSummary }>(
    `/api/donations/summary?month=${month}`,
  );
  return summary;
}

export async function createDonation(payload: DonationPayload): Promise<Donation> {
  const { donation } = await apiRequest<{ donation: Donation }>('/api/donations', {
    method: 'POST',
    body: payload,
  });
  return donation;
}

export async function updateDonation(id: string, payload: DonationPayload): Promise<Donation> {
  const { donation } = await apiRequest<{ donation: Donation }>(`/api/donations/${id}`, {
    method: 'PATCH',
    body: payload,
  });
  return donation;
}

export async function deleteDonation(id: string): Promise<void> {
  await apiRequest<null>(`/api/donations/${id}`, { method: 'DELETE' });
}
