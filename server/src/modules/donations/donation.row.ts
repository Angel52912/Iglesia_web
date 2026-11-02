import { z } from 'zod';
import { DONATION_METHODS } from './donations.types.js';

export const DONATION_COLUMNS = 'id,member_id,donated_on,amount,concept,method';

export const donationRowSchema = z.object({
  id: z.uuid(),
  member_id: z.uuid().nullable(),
  donated_on: z.string(),
  amount: z.coerce.number(),
  concept: z.string(),
  method: z.enum(DONATION_METHODS),
});

export const donorRowSchema = z.object({ id: z.uuid(), full_name: z.string() });

export const summaryRowSchema = z.object({
  method: z.enum(DONATION_METHODS),
  concept: z.string().nullable(),
  total: z.coerce.number(),
  donations: z.coerce.number(),
});

export type DonationRow = z.infer<typeof donationRowSchema>;
