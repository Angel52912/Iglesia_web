import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '../src/auth/roles';
import * as eventsApi from '../src/features/events/api';
import * as membersApi from '../src/features/members/api';
import { MinistriesPage } from '../src/features/ministries/MinistriesPage';
import * as api from '../src/features/ministries/api';
import { WithAuth, authValue } from './authTestUtils';

vi.mock('../src/features/ministries/api');
vi.mock('../src/features/events/api');
vi.mock('../src/features/members/api');

const musica: api.Ministry = {
  id: 'min1',
  name: 'Música',
  description: 'Alabanza',
  active: true,
  coordinators: [{ id: 'm1', fullName: 'Ana Pérez' }],
  memberCount: 1,
};

const detail: api.MinistryDetail = {
  ...musica,
  members: [{ id: 'm2', fullName: 'Luis Gómez' }],
};

const upcomingEvent: eventsApi.ChurchEvent = {
  id: 'e1',
  title: 'Ensayo general',
  description: null,
  eventDate: '2026-11-20',
  startTime: '19:00',
  location: null,
  type: 'religious',
  category: 'activity',
  status: 'scheduled',
  ministryId: 'min1',
  ministryName: 'Música',
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

function renderAs(role: Role): void {
  render(
    <WithAuth
      value={authValue({
        status: 'authenticated',
        user: { id: 'u', email: 'u@iglesia.test', fullName: 'Usuario', role },
      })}
    >
      <MemoryRouter>
        <MinistriesPage />
      </MemoryRouter>
    </WithAuth>,
  );
}

describe('MinistriesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.listMinistries).mockResolvedValue([musica]);
    vi.mocked(api.getMinistry).mockResolvedValue(detail);
    vi.mocked(eventsApi.listEvents).mockResolvedValue([upcomingEvent]);
    vi.mocked(membersApi.listMembers).mockResolvedValue([
      member('m1', 'Ana Pérez'),
      member('m2', 'Luis Gómez'),
    ]);
  });

  it('el pastor registra un ministerio', async () => {
    vi.mocked(api.createMinistry).mockResolvedValue(detail);
    renderAs('pastor');

    expect(await screen.findByText('Música')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Niños' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ministerio' }));

    await waitFor(() => {
      expect(api.createMinistry).toHaveBeenCalledWith({ name: 'Niños', description: '' });
    });
  });

  it('muestra integrantes y actividades programadas y guarda los integrantes', async () => {
    vi.mocked(api.setMembers).mockResolvedValue({ ...detail, memberCount: 2 });
    renderAs('admin');
    await screen.findByText('Música');

    fireEvent.click(screen.getByRole('button', { name: 'Ver integrantes y actividades' }));
    expect(await screen.findByText('Ensayo general')).toBeTruthy();
    expect(eventsApi.listEvents).toHaveBeenCalledWith(
      expect.objectContaining({ ministryId: 'min1', status: 'scheduled' }),
    );

    const [ana] = await screen.findAllByRole('checkbox', { name: 'Ana Pérez' });
    // Hay dos listas (coordinadores e integrantes): el segundo grupo es el de integrantes.
    expect(ana).toBeTruthy();
    const memberBoxes = screen.getAllByRole('checkbox', { name: 'Ana Pérez' });
    fireEvent.click(memberBoxes[1] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar integrantes' }));

    await waitFor(() => {
      expect(api.setMembers).toHaveBeenCalledWith('min1', ['m2', 'm1']);
    });
  });

  it('el secretario solo consulta: sin formulario ni edición, ve la lista de integrantes', async () => {
    renderAs('secretary');

    expect(await screen.findByText('Música')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Registrar ministerio' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Desactivar' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Ver integrantes y actividades' }));
    expect(await screen.findByText('Luis Gómez')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Guardar integrantes' })).toBeNull();
    expect(membersApi.listMembers).not.toHaveBeenCalled();
  });
});
