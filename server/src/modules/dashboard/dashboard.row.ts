import { z } from 'zod';

const count = z.coerce.number();

export const dashboardRowSchema = z.object({
  activeMembers: count.optional(),
  ministries: count.optional(),
  attendance: z.object({ present: count, total: count }).optional(),
  upcomingCount: count.optional(),
  upcomingEvents: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        eventDate: z.string(),
        startTime: z.string(),
        location: z.string().nullable(),
      }),
    )
    .optional(),
  attendanceByEvent: z
    .array(
      z.object({
        eventId: z.string(),
        title: z.string(),
        eventDate: z.string(),
        present: count,
        absent: count,
      }),
    )
    .optional(),
  income: z
    .object({
      month: z.string(),
      monthTotal: z.coerce.number(),
      monthDonations: count,
      byMonth: z.array(z.object({ month: z.string(), total: z.coerce.number() })),
    })
    .optional(),
});

export type DashboardRow = z.infer<typeof dashboardRowSchema>;
