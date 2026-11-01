import { z } from 'zod';

export const MEMBER_COLUMNS = 'id,full_name,phone,email,joined_on,active,created_at';

export const memberRowSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  joined_on: z.string(),
  active: z.boolean(),
  created_at: z.string(),
});

export type MemberRow = z.infer<typeof memberRowSchema>;
