export interface UpcomingEvent {
  id: string;
  title: string;
  eventDate: string;
  startTime: string;
  location: string | null;
}

export interface EventAttendanceBar {
  eventId: string;
  title: string;
  eventDate: string;
  present: number;
  absent: number;
}

export interface MonthIncome {
  month: string;
  total: number;
}

export interface IncomeStats {
  month: string;
  monthTotal: number;
  monthDonations: number;
  byMonth: MonthIncome[];
}

export interface GeneralStats {
  activeMembers: number;
  ministries: number;
  attendance: { present: number; total: number };
  upcomingCount: number;
  upcomingEvents: UpcomingEvent[];
  attendanceByEvent: EventAttendanceBar[];
}

// general es null para el tesorero; income es null para quien no ve ingresos.
export interface DashboardData {
  general: GeneralStats | null;
  income: IncomeStats | null;
}

// Acceso a la función dashboard_stats con el JWT del usuario (la BD valida el rol).
export interface DashboardRepository {
  stats(): Promise<DashboardData>;
}
