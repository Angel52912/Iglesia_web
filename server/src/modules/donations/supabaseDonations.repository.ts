import type { SupabaseClient } from '@supabase/supabase-js';
import { toDbError } from '../shared/dbError.js';
import {
  DONATION_COLUMNS,
  donationRowSchema,
  donorRowSchema,
  summaryRowSchema,
  type DonationRow,
} from './donation.row.js';
import type {
  CreateDonationInput,
  Donation,
  DonationFilters,
  DonationsRepository,
  DonorRef,
  SummaryRow,
  UpdateDonationInput,
} from './donations.types.js';

function toDonation(row: DonationRow, donors: Map<string, string>): Donation {
  return {
    id: row.id,
    memberId: row.member_id,
    donorName: row.member_id ? (donors.get(row.member_id) ?? null) : null,
    donatedOn: row.donated_on,
    amount: row.amount,
    concept: row.concept,
    method: row.method,
  };
}

export class SupabaseDonationsRepository implements DonationsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(filters: DonationFilters): Promise<Donation[]> {
    let query = this.db
      .from('donations')
      .select(DONATION_COLUMNS)
      .order('donated_on', { ascending: false })
      .order('created_at', { ascending: false });
    if (filters.from) query = query.gte('donated_on', filters.from);
    if (filters.to) query = query.lte('donated_on', filters.to);
    if (filters.memberId) query = query.eq('member_id', filters.memberId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return this.withDonors(donationRowSchema.array().parse(data));
  }

  async listDonors(): Promise<DonorRef[]> {
    const result = await this.db.rpc('donation_donors');
    if (result.error) throw new Error(result.error.message);
    const data: unknown = result.data;
    return donorRowSchema
      .array()
      .parse(data)
      .map((row) => ({ id: row.id, fullName: row.full_name }));
  }

  async summaryRows(from: string, to: string): Promise<SummaryRow[]> {
    const result = await this.db.rpc('donation_summary', { p_from: from, p_to: to });
    if (result.error) throw new Error(result.error.message);
    const data: unknown = result.data;
    return summaryRowSchema.array().parse(data);
  }

  async create(input: CreateDonationInput): Promise<Donation> {
    const { data, error } = await this.db
      .from('donations')
      .insert({
        member_id: input.memberId,
        donated_on: input.donatedOn,
        amount: input.amount,
        concept: input.concept,
        method: input.method,
      })
      .select(DONATION_COLUMNS)
      .single();
    if (error) throw toDbError(error);
    return this.withDonor(donationRowSchema.parse(data));
  }

  async update(id: string, patch: UpdateDonationInput): Promise<Donation | null> {
    const changes: Record<string, string | number | null> = {};
    if (patch.memberId !== undefined) changes.member_id = patch.memberId;
    if (patch.donatedOn !== undefined) changes.donated_on = patch.donatedOn;
    if (patch.amount !== undefined) changes.amount = patch.amount;
    if (patch.concept !== undefined) changes.concept = patch.concept;
    if (patch.method !== undefined) changes.method = patch.method;
    const { data, error } = await this.db
      .from('donations')
      .update(changes)
      .eq('id', id)
      .select(DONATION_COLUMNS);
    if (error) throw toDbError(error);
    // Si RLS filtra el update no hay error: devuelve 0 filas.
    const [row] = donationRowSchema.array().parse(data);
    return row ? this.withDonor(row) : null;
  }

  async remove(id: string): Promise<boolean> {
    const { data, error } = await this.db.from('donations').delete().eq('id', id).select('id');
    if (error) throw new Error(error.message);
    return Array.isArray(data) && data.length > 0;
  }

  private async withDonors(rows: DonationRow[]): Promise<Donation[]> {
    // Sin donantes con nombre no hace falta consultar la lista de miembros.
    if (!rows.some((row) => row.member_id)) return rows.map((row) => toDonation(row, new Map()));
    const donors = await this.listDonors();
    const names = new Map(donors.map((donor) => [donor.id, donor.fullName]));
    return rows.map((row) => toDonation(row, names));
  }

  private async withDonor(row: DonationRow): Promise<Donation> {
    const [donation] = await this.withDonors([row]);
    if (!donation) throw new Error('No se pudo leer la donación');
    return donation;
  }
}
