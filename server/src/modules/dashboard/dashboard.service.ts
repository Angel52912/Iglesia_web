import type { DashboardData, DashboardRepository } from './dashboard.types.js';

export class DashboardService {
  constructor(private readonly dashboard: DashboardRepository) {}

  stats(): Promise<DashboardData> {
    return this.dashboard.stats();
  }
}
