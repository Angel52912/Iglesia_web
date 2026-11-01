import { z } from 'zod';

// Los miembros llegan anidados; el nombre se puede ocultar por RLS, por eso son nullable.
export const MINISTRY_COLUMNS =
  'id,name,description,active,ministry_coordinators(members(id,full_name)),ministry_members(members(id,full_name))';

const memberEmbedSchema = z
  .object({ members: z.object({ id: z.uuid(), full_name: z.string() }).nullable() })
  .array();

export const ministryRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  active: z.boolean(),
  ministry_coordinators: memberEmbedSchema,
  ministry_members: memberEmbedSchema,
});

export type MinistryRow = z.infer<typeof ministryRowSchema>;
