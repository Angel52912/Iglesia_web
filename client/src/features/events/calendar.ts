const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export interface MonthRef {
  year: number;
  /** 0 = enero. */
  month: number;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

// Fecha local en formato YYYY-MM-DD (sin pasar por UTC, para no correr el día).
export function toIsoDate(year: number, month: number, day: number): string {
  return `${String(year)}-${pad(month + 1)}-${pad(day)}`;
}

export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

export function monthLabel({ year, month }: MonthRef): string {
  return `${MONTH_NAMES[month] ?? ''} ${String(year)}`;
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const index = year * 12 + month + delta;
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 };
}

export function monthRange({ year, month }: MonthRef): { from: string; to: string } {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return { from: toIsoDate(year, month, 1), to: toIsoDate(year, month, lastDay) };
}

// Semanas del mes (domingo a sábado); null = celda vacía antes o después del mes.
export function buildMonthGrid({ year, month }: MonthRef): (string | null)[][] {
  const leading = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= days; day += 1) cells.push(toIsoDate(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let start = 0; start < cells.length; start += 7) weeks.push(cells.slice(start, start + 7));
  return weeks;
}

export function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return iso;
  const weekday = WEEKDAY_SHORT[new Date(year, month - 1, day).getDay()] ?? '';
  return `${weekday} ${String(day)} de ${(MONTH_NAMES[month - 1] ?? '').toLowerCase()}`;
}
