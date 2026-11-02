import type { AttendanceService } from '../attendance/attendance.service.js';
import { monthRange, type DonationsService } from '../donations/donations.service.js';
import type { DonationMethod } from '../donations/donations.types.js';
import type { MembersService } from '../members/members.service.js';
import type { MinistriesService } from '../ministries/ministries.service.js';
import type { MemberStatus, PeriodFilters, ReportTable } from './reports.types.js';

const METHOD_LABELS: Record<DonationMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  check: 'Cheque',
  other: 'Otro',
};

const STATUS_LABELS: Record<MemberStatus, string> = {
  all: 'Todos los miembros',
  active: 'Solo miembros activos',
  inactive: 'Solo miembros inactivos',
};

// "2026-11-02" -> "02/11/2026"
export function formatDate(iso: string): string {
  const [year = '', month = '', day = ''] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function formatMoney(amount: number): string {
  const text = amount.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `$${text}`;
}

function periodLabel(period: PeriodFilters): string {
  return `Del ${formatDate(period.from)} al ${formatDate(period.to)}`;
}

// Meses (AAAA-MM) que toca el periodo, en orden.
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  const last = to.slice(0, 7);
  for (;;) {
    const key = `${String(year)}-${String(month).padStart(2, '0')}`;
    months.push(key);
    if (key >= last) break;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

// Reportes armados con los servicios existentes: heredan sus permisos (RLS con el JWT del usuario).
export class ReportsService {
  constructor(
    private readonly members: MembersService,
    private readonly attendance: AttendanceService,
    private readonly ministries: MinistriesService,
    private readonly donations: DonationsService,
  ) {}

  async membersReport(status: MemberStatus): Promise<ReportTable> {
    const filters = status === 'all' ? {} : { active: status === 'active' };
    const list = await this.members.list(filters);
    const active = list.filter((member) => member.active).length;
    return {
      slug: 'miembros',
      title: 'Reporte general de miembros',
      subtitle: STATUS_LABELS[status],
      columns: [
        { header: 'Nombre', kind: 'text' },
        { header: 'Teléfono', kind: 'text' },
        { header: 'Correo', kind: 'text' },
        { header: 'Fecha de ingreso', kind: 'text' },
        { header: 'Estado', kind: 'text' },
      ],
      rows: list.map((member) => [
        member.fullName,
        member.phone,
        member.email,
        formatDate(member.joinedOn),
        member.active ? 'Activo' : 'Inactivo',
      ]),
      summary: [
        { label: 'Total de miembros', value: String(list.length) },
        { label: 'Activos', value: String(active) },
        { label: 'Inactivos', value: String(list.length - active) },
      ],
    };
  }

  async attendanceReport(period: PeriodFilters): Promise<ReportTable> {
    const history = await this.attendance.history(period);
    const present = history.reduce((sum, item) => sum + item.present, 0);
    const absent = history.reduce((sum, item) => sum + item.absent, 0);
    return {
      slug: 'asistencia',
      title: 'Reporte de asistencia por evento',
      subtitle: periodLabel(period),
      columns: [
        { header: 'Evento', kind: 'text' },
        { header: 'Fecha', kind: 'text' },
        { header: 'Presentes', kind: 'number' },
        { header: 'Ausentes', kind: 'number' },
        { header: '% de asistencia', kind: 'percent' },
      ],
      rows: history.map((item) => {
        const total = item.present + item.absent;
        return [
          item.title,
          formatDate(item.eventDate),
          item.present,
          item.absent,
          total === 0 ? 0 : Math.round((item.present / total) * 1000) / 10,
        ];
      }),
      summary: [
        { label: 'Eventos con asistencia', value: String(history.length) },
        { label: 'Presentes', value: String(present) },
        { label: 'Ausentes', value: String(absent) },
      ],
    };
  }

  async ministriesReport(): Promise<ReportTable> {
    const list = await this.ministries.list();
    const participations = list.reduce((sum, ministry) => sum + ministry.memberCount, 0);
    return {
      slug: 'ministerios',
      title: 'Reporte de participación por ministerio',
      subtitle: null,
      columns: [
        { header: 'Ministerio', kind: 'text' },
        { header: 'Estado', kind: 'text' },
        { header: 'Coordinadores', kind: 'text' },
        { header: 'Integrantes', kind: 'number' },
      ],
      rows: list.map((ministry) => [
        ministry.name,
        ministry.active ? 'Activo' : 'Inactivo',
        ministry.coordinators.map((coordinator) => coordinator.fullName).join(', ') || null,
        ministry.memberCount,
      ]),
      summary: [
        { label: 'Ministerios', value: String(list.length) },
        // Un miembro en dos ministerios cuenta en ambos.
        { label: 'Participaciones (integrantes)', value: String(participations) },
      ],
    };
  }

  // Solo agregados por mes y método (nunca donantes ni conceptos): también lo puede ver el pastor.
  async incomeReport(period: PeriodFilters): Promise<ReportTable> {
    const whole = await this.donations.rangeSummary(period.from, period.to);
    const perMonth = await Promise.all(
      monthsBetween(period.from, period.to).map(async (month) => {
        const range = monthRange(month);
        const from = range.from < period.from ? period.from : range.from;
        const to = range.to > period.to ? period.to : range.to;
        return { month, ...(await this.donations.rangeSummary(from, to)) };
      }),
    );
    return {
      slug: 'ingresos',
      title: 'Reporte de ingresos por periodo',
      subtitle: periodLabel(period),
      columns: [
        { header: 'Mes', kind: 'text' },
        { header: 'Donaciones', kind: 'number' },
        { header: 'Total', kind: 'money' },
      ],
      rows: perMonth.map((item) => [item.month, item.donations, item.total]),
      summary: [
        { label: 'Total de ingresos', value: formatMoney(whole.total) },
        { label: 'Donaciones registradas', value: String(whole.donations) },
        ...whole.byMethod.map((group) => ({
          label: METHOD_LABELS[group.key as DonationMethod],
          value: formatMoney(group.total),
        })),
      ],
    };
  }
}
