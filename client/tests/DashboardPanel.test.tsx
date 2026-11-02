import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../src/features/dashboard/api';
import { DashboardPanel } from '../src/features/dashboard/DashboardPanel';

vi.mock('../src/features/dashboard/api', () => ({ getDashboard: vi.fn() }));

const general: api.GeneralStats = {
  activeMembers: 42,
  ministries: 5,
  attendance: { present: 30, total: 40 },
  upcomingCount: 2,
  upcomingEvents: [
    {
      id: 'e1',
      title: 'Culto dominical',
      eventDate: '2026-11-08',
      startTime: '10:00',
      location: 'Templo',
    },
  ],
  attendanceByEvent: [
    { eventId: 'e0', title: 'Culto anterior', eventDate: '2026-11-01', present: 30, absent: 10 },
  ],
};

const income: api.IncomeStats = {
  month: '2026-11',
  monthTotal: 1500,
  monthDonations: 3,
  byMonth: [
    { month: '2026-10', total: 500 },
    { month: '2026-11', total: 1500 },
  ],
};

describe('DashboardPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra cifras, próximos eventos, gráficas e ingresos', async () => {
    vi.mocked(api.getDashboard).mockResolvedValue({ general, income });
    render(<DashboardPanel />);

    expect(await screen.findByText('Miembros activos')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('Eventos próximos')).toBeTruthy();
    expect(screen.getByText('Culto dominical')).toBeTruthy();
    expect(screen.getByText(/30 presentes, 10 ausentes \(75 %\)/)).toBeTruthy();
    expect(screen.getByText('Ingresos de 2026-11')).toBeTruthy();
    expect(screen.getByText('Ingresos de los últimos 6 meses')).toBeTruthy();
  });

  it('sin ingresos no muestra nada financiero', async () => {
    vi.mocked(api.getDashboard).mockResolvedValue({ general, income: null });
    render(<DashboardPanel />);

    expect(await screen.findByText('Miembros activos')).toBeTruthy();
    expect(screen.queryByText(/Ingresos/)).toBeNull();
  });

  it('el tesorero ve solo ingresos', async () => {
    vi.mocked(api.getDashboard).mockResolvedValue({ general: null, income });
    render(<DashboardPanel />);

    expect(await screen.findByText('Ingresos de 2026-11')).toBeTruthy();
    expect(screen.queryByText('Miembros activos')).toBeNull();
  });

  it('muestra el error si falla la carga', async () => {
    vi.mocked(api.getDashboard).mockRejectedValue(new Error('No se pudo conectar'));
    render(<DashboardPanel />);

    expect(await screen.findByText('No se pudo conectar')).toBeTruthy();
  });
});
