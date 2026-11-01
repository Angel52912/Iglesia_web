import { z } from 'zod';
import { ROLES } from '../../types/auth.js';

export const PROFILE_COLUMNS = 'id,email,full_name,role,active,created_at';

export const profileRowSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  full_name: z.string(),
  role: z.enum(ROLES),
  active: z.boolean(),
  created_at: z.string(),
});

export type ProfileRow = z.infer<typeof profileRowSchema>;
