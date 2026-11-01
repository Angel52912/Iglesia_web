import { describe, expect, it } from 'vitest';
import {
  buildMonthGrid,
  formatLongDate,
  monthLabel,
  monthRange,
  shiftMonth,
  toIsoDate,
  todayIso,
} from '../src/features/events/calendar';

describe('calendar', () => {
  it('arma semanas de domingo a sábado con celdas vacías', () => {
    // 1 de noviembre de 2026 cae en domingo y el mes tiene 30 días.
    const weeks = buildMonthGrid({ year: 2026, month: 10 });
    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0]?.[0]).toBe('2026-11-01');
    expect(weeks[4]).toEqual(['2026-11-29', '2026-11-30', null, null, null, null, null]);
  });

  it('rellena con vacíos antes del primer día', () => {
    // 1 de diciembre de 2026 cae en martes.
    const first = buildMonthGrid({ year: 2026, month: 11 })[0];
    expect(first?.slice(0, 3)).toEqual([null, null, '2026-12-01']);
  });

  it('cambia de mes cruzando el año', () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });

  it('calcula el rango del mes, incluido febrero bisiesto', () => {
    expect(monthRange({ year: 2028, month: 1 })).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('formatea fechas sin correr el día por la zona horaria', () => {
    expect(toIsoDate(2026, 0, 5)).toBe('2026-01-05');
    expect(todayIso(new Date(2026, 10, 8))).toBe('2026-11-08');
    expect(monthLabel({ year: 2026, month: 10 })).toBe('Noviembre 2026');
    expect(formatLongDate('2026-11-08')).toBe('Dom 8 de noviembre');
  });
});
