import { apiDownload, apiRequest } from '../../lib/apiClient';
import type { Role } from '../../auth/roles';

export type ReportKey = 'members' | 'attendance' | 'ministries' | 'income';
export type ReportFormat = 'pdf' | 'xlsx';
export type MemberStatus = 'all' | 'active' | 'inactive';
export type ColumnKind = 'text' | 'number' | 'money' | 'percent';

export interface ReportColumn {
  header: string;
  kind: ColumnKind;
}

export type ReportCell = string | number | null;

export interface ReportTable {
  slug: string;
  title: string;
  subtitle: string | null;
  columns: ReportColumn[];
  rows: ReportCell[][];
  summary: { label: string; value: string }[];
}

export interface ReportOption {
  key: ReportKey;
  label: string;
  needsPeriod: boolean;
  roles: readonly Role[];
}

// Igual que la matriz del servidor (el servidor es quien realmente valida).
export const REPORT_OPTIONS: readonly ReportOption[] = [
  {
    key: 'members',
    label: 'Miembros',
    needsPeriod: false,
    roles: ['admin', 'pastor', 'secretary'],
  },
  {
    key: 'attendance',
    label: 'Asistencia por evento',
    needsPeriod: true,
    roles: ['admin', 'pastor', 'secretary'],
  },
  {
    key: 'ministries',
    label: 'Participación por ministerio',
    needsPeriod: false,
    roles: ['admin', 'pastor'],
  },
  {
    key: 'income',
    label: 'Ingresos por periodo',
    needsPeriod: true,
    roles: ['admin', 'pastor', 'treasurer'],
  },
];

export interface ReportParams {
  from: string;
  to: string;
  status: MemberStatus;
}

function pathFor(key: ReportKey, params: ReportParams, format?: ReportFormat): string {
  const query = new URLSearchParams();
  if (key === 'members') query.set('status', params.status);
  if (key === 'attendance' || key === 'income') {
    query.set('from', params.from);
    query.set('to', params.to);
  }
  if (format) query.set('format', format);
  const text = query.toString();
  return `/api/reports/${key}${text ? `?${text}` : ''}`;
}

export async function fetchReport(key: ReportKey, params: ReportParams): Promise<ReportTable> {
  const { report } = await apiRequest<{ report: ReportTable }>(pathFor(key, params));
  return report;
}

export async function downloadReport(
  key: ReportKey,
  params: ReportParams,
  format: ReportFormat,
): Promise<void> {
  const { blob, filename } = await apiDownload(pathFor(key, params, format));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
