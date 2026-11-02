import { z } from 'zod';

export const ANNOUNCEMENT_COLUMNS = 'id,title,body,important,published_on';

export const announcementRowSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  body: z.string(),
  important: z.boolean(),
  published_on: z.string(),
});

export type AnnouncementRow = z.infer<typeof announcementRowSchema>;
