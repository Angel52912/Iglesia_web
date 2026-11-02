import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../../errors.js';
import { dashboardRowSchema } from './dashboard.row.js';
import type { DashboardData, DashboardRepository } from './dashboard.types.js';

export class SupabaseDashboardRepository implements DashboardRepository {
  constructor(private readonly db: SupabaseClient) {}

  async stats(): Promise<DashboardData> {
    const result = await this.db.rpc('dashboard_stats');
    // 42501 = la función rechazó el rol: es un 403, no un error del servidor.
    if (result.error?.code === '42501') {
      throw new HttpError(403, 'No tienes permiso para ver el panel principal');
    }
    if (result.error) throw new Error(result.error.message);
    const data: unknown = result.data;
    const row = dashboardRowSchema.parse(data);
    const general =
      row.activeMembers === undefined ||
      row.ministries === undefined ||
      row.attendance === undefined ||
      row.upcomingCount === undefined
        ? null
        : {
            activeMembers: row.activeMembers,
            ministries: row.ministries,
            attendance: row.attendance,
            upcomingCount: row.upcomingCount,
            upcomingEvents: row.upcomingEvents ?? [],
            attendanceByEvent: row.attendanceByEvent ?? [],
          };
    return { general, income: row.income ?? null };
  }
}
