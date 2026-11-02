export const DONATION_METHODS = ['cash', 'transfer', 'card', 'check', 'other'] as const;

export type DonationMethod = (typeof DONATION_METHODS)[number];

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

export interface DonorRef {
  id: string;
  fullName: string;
}

export interface DonationFilters {
  from?: string | undefined;
  to?: string | undefined;
  memberId?: string | undefined;
}

export interface CreateDonationInput {
  memberId: string | null;
  donatedOn: string;
  amount: number;
  concept: string;
  method: DonationMethod;
}

export interface UpdateDonationInput {
  memberId?: string | null | undefined;
  donatedOn?: string | undefined;
  amount?: number | undefined;
  concept?: string | undefined;
  method?: DonationMethod | undefined;
}

// Fila agregada que devuelve donation_summary (sin donantes).
// concept es null para el pastor: la BD no le entrega el texto libre.
export interface SummaryRow {
  method: DonationMethod;
  concept: string | null;
  total: number;
  donations: number;
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
  // null cuando el rol no puede ver conceptos (pastor).
  byConcept: SummaryGroup[] | null;
}

export interface DonationList {
  donations: Donation[];
  total: number;
}

// Acceso a donations y a las funciones donation_summary / donation_donors con el JWT del usuario (RLS aplica).
export interface DonationsRepository {
  list(filters: DonationFilters): Promise<Donation[]>;
  listDonors(): Promise<DonorRef[]>;
  summaryRows(from: string, to: string): Promise<SummaryRow[]>;
  create(input: CreateDonationInput): Promise<Donation>;
  update(id: string, patch: UpdateDonationInput): Promise<Donation | null>;
  remove(id: string): Promise<boolean>;
}

// Total de un rango arbitrario de fechas (sin donantes ni conceptos).
export interface RangeSummary {
  total: number;
  donations: number;
  byMethod: SummaryGroup[];
}
