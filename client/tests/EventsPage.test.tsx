import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '../src/auth/roles';
import * as api from '../src/features/events/api';
import { EventsPage } from '../src/features/events/EventsPage';
import * as membersApi from '../src/features/members/api';
import * as ministriesApi from '../src/features/ministries/api';
import { WithAuth, authValue } from './authTestUtils';

vi.mock('../src/features/events/api');
vi.mock('../src/features/members/api');
vi.mock('../src/features/ministries/api');

const culto: api.ChurchEvent = {
  id: 'e1',
  title: 'Culto dominical',
  description: null,
  eventDate: '2026-11-08',
  startTime: '10:00',
  location: 'Templo',
  type: 'religious',
  category: 'worship',
  status: 'scheduled',
  ministryId: null,
  ministryName: null,
  responsibles: [{ id: 'm1', fullName: 'Ana Pérez' }],
};

const reunion: api.ChurchEvent = {
  ...culto,
  id: 'e2',
  title: 'Reunión de líderes',
  eventDate: '2026-11-15',
  type: 'administrative',
  category: 'meeting',
  responsibles: [],
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
        <EventsPage />
      </MemoryRouter>
    </WithAuth>,
  );
}

describe('EventsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Solo la fecha: los temporizadores reales siguen funcionando para waitFor.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 8, 9, 0) });
    vi.mocked(api.listEvents).mockResolvedValue([culto, reunion]);
    vi.mocked(membersApi.listMembers).mockResolvedValue([
      {
        id: 'm1',
        fullName: 'Ana Pérez',
        phone: null,
        email: null,
        joinedOn: '2026-01-01',
        active: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
    vi.mocked(ministriesApi.listMinistries).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra los eventos del día elegido y cambia al tocar otro día', async () => {
    renderAs('secretary');

    expect(await screen.findByText('Culto dominical')).toBeTruthy();
    expect(screen.getByText('Responsables: Ana Pérez')).toBeTruthy();
    expect(screen.queryByText('Reunión de líderes')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Dom 15 de noviembre/ }));
    expect(await screen.findByText('Reunión de líderes')).toBeTruthy();
  });

  it('pide los eventos del mes visible y al cambiar de mes', async () => {
    renderAs('secretary');
    await screen.findByText('Culto dominical');
    expect(api.listEvents).toHaveBeenLastCalledWith({ from: '2026-11-01', to: '2026-11-30' });

    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    await waitFor(() => {
      expect(api.listEvents).toHaveBeenLastCalledWith({ from: '2026-12-01', to: '2026-12-31' });
    });
  });

  it('crea un evento con la fecha del día elegido', async () => {
    vi.mocked(api.createEvent).mockResolvedValue(culto);
    renderAs('secretary');
    await screen.findByText('Culto dominical');

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Vigilia' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ana Pérez' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear evento' }));

    await waitFor(() => {
      expect(api.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Vigilia',
          eventDate: '2026-11-08',
          startTime: '10:00',
          responsibleIds: ['m1'],
        }),
      );
    });
  });

  it('cancela un evento sin eliminarlo', async () => {
    vi.mocked(api.updateEvent).mockResolvedValue({ ...culto, status: 'cancelled' });
    renderAs('pastor');
    await screen.findByText('Culto dominical');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar evento' }));
    await waitFor(() => {
      expect(api.updateEvent).toHaveBeenCalledWith('e1', { status: 'cancelled' });
    });
  });

  it('el tesorero solo consulta: sin formulario ni botones de cambio', async () => {
    renderAs('treasurer');

    expect(await screen.findByText('Culto dominical')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Crear evento' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancelar evento' })).toBeNull();
    expect(membersApi.listMembers).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor al crear', async () => {
    vi.mocked(api.createEvent).mockRejectedValue(new Error('La hora no es válida'));
    renderAs('admin');
    await screen.findByText('Culto dominical');

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Vigilia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear evento' }));
    expect((await screen.findByRole('alert')).textContent).toBe('La hora no es válida');
  });
});
