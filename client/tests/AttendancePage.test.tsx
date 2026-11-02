import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '../src/auth/roles';
import { AttendancePage } from '../src/features/attendance/AttendancePage';
import * as api from '../src/features/attendance/api';
import * as eventsApi from '../src/features/events/api';
import * as membersApi from '../src/features/members/api';
import { WithAuth, authValue } from './authTestUtils';

vi.mock('../src/features/attendance/api');
vi.mock('../src/features/events/api');
vi.mock('../src/features/members/api');

const culto: eventsApi.ChurchEvent = {
  id: 'e1',
  title: 'Culto dominical',
  description: null,
  eventDate: '2026-11-08',
  startTime: '10:00',
  location: null,
  type: 'religious',
  category: 'worship',
  status: 'scheduled',
  ministryId: null,
  ministryName: null,
  responsibles: [],
};

function member(id: string, fullName: string): membersApi.Member {
  return {
    id,
    fullName,
    phone: null,
    email: null,
    joinedOn: '2026-01-01',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

const attendanceOfCulto: api.EventAttendance = {
  event: {
    id: 'e1',
    title: 'Culto dominical',
    eventDate: '2026-11-08',
    category: 'worship',
    status: 'scheduled',
  },
  records: [{ memberId: 'm1', fullName: 'Ana Pérez', present: true }],
};

function renderAs(role: Role): void {
  render(
    <WithAuth
      value={authValue({
        status: 'authenticated',
        user: { id: 'u', email: 'u@iglesia.test', fullName: 'Usuario', role },
      })}
    >
      <MemoryRouter>
        <AttendancePage />
      </MemoryRouter>
    </WithAuth>,
  );
}

async function checkbox(name: string): Promise<HTMLInputElement> {
  return screen.findByRole<HTMLInputElement>('checkbox', { name });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(eventsApi.listEvents).mockResolvedValue([culto]);
  vi.mocked(membersApi.listMembers).mockResolvedValue([
    member('m1', 'Ana Pérez'),
    member('m2', 'Luis Gómez'),
  ]);
  vi.mocked(api.getEventAttendance).mockResolvedValue(attendanceOfCulto);
  vi.mocked(api.saveEventAttendance).mockResolvedValue(attendanceOfCulto);
  vi.mocked(api.listAttendanceHistory).mockResolvedValue([]);
  vi.mocked(api.getAttendanceReport).mockResolvedValue({
    period: 'week',
    from: '2026-11-02',
    to: '2026-11-08',
    totals: { events: 1, present: 1, absent: 1 },
    events: [],
  });
});

describe('AttendancePage', () => {
  it('carga la asistencia ya registrada y guarda presentes y ausentes', async () => {
    renderAs('secretary');
    const ana = await checkbox('Ana Pérez');
    const luis = await checkbox('Luis Gómez');
    await waitFor(() => {
      expect(ana.checked).toBe(true);
    });
    expect(luis.checked).toBe(false);

    fireEvent.click(luis);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar asistencia' }));

    await waitFor(() => {
      expect(api.saveEventAttendance).toHaveBeenCalledWith('e1', [
        { memberId: 'm1', present: true },
        { memberId: 'm2', present: true },
      ]);
    });
    expect(await screen.findByText('Asistencia guardada')).toBeTruthy();
  });

  it('el botón "Todos presentes" marca a todos los miembros', async () => {
    renderAs('admin');
    const luis = await checkbox('Luis Gómez');
    fireEvent.click(screen.getByRole('button', { name: 'Todos presentes' }));
    expect(luis.checked).toBe(true);
  });

  it('el pastor solo consulta: casillas deshabilitadas y sin botón de guardar', async () => {
    renderAs('pastor');
    expect((await checkbox('Ana Pérez')).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Guardar asistencia' })).toBeNull();
  });

  it('avisa si no hay eventos en la fecha elegida', async () => {
    vi.mocked(eventsApi.listEvents).mockResolvedValue([]);
    renderAs('secretary');
    expect(await screen.findByText('No hay eventos ese día')).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('muestra el error del servidor al guardar', async () => {
    vi.mocked(api.saveEventAttendance).mockRejectedValue(new Error('Evento cancelado'));
    renderAs('secretary');
    await checkbox('Ana Pérez');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar asistencia' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Evento cancelado');
  });

  it('muestra los totales del reporte', async () => {
    renderAs('secretary');
    expect(await screen.findByText(/1 eventos · 1 presentes · 1 ausentes/)).toBeTruthy();
  });
});
