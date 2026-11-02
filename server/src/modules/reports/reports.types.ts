export const REPORT_FORMATS = ['json', 'pdf', 'xlsx'] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export const MEMBER_STATUSES = ['all', 'active', 'inactive'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export type ColumnKind = 'text' | 'number' | 'money' | 'percent';

export interface ReportColumn {
  header: string;
  kind: ColumnKind;
}

export type ReportCell = string | number | null;

export interface ReportSummaryLine {
  label: string;
  value: string;
}

// Tabla neutral: el mismo resultado se muestra en pantalla y se exporta a PDF o Excel.
export interface ReportTable {
  slug: string;
  title: string;
  subtitle: string | null;
  columns: ReportColumn[];
  rows: ReportCell[][];
  summary: ReportSummaryLine[];
}

export interface PeriodFilters {
  from: string;
  to: string;
}
