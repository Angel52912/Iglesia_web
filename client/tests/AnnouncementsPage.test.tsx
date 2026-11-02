import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '../src/auth/roles';
import * as api from '../src/features/announcements/api';
import { AnnouncementsPage } from '../src/features/announcements/AnnouncementsPage';
import * as eventsApi from '../src/features/events/api';
import { WithAuth, authValue } from './authTestUtils';

vi.mock('../src/features/announcements/api');
vi.mock('../src/features/events/api');

const retiro: api.Announcement = {
  id: 'a1',
  title: 'Retiro de jóvenes',
  body: 'Sábado a las 8:00',
  important: true,
  publishedOn: '2026-11-02',
};

const aviso: api.Announcement = {
  id: 'a2',
  title: 'Cambio de horario',
  body: 'El culto será a las 11:00',
  important: false,
  publishedOn: '2026-11-01',
};

const culto: eventsApi.ChurchEvent = {
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
        <AnnouncementsPage />
      </MemoryRouter>
    </WithAuth>,
  );
}

describe('AnnouncementsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 2, 9, 0) });
    vi.mocked(api.listAnnouncements).mockResolvedValue([retiro, aviso]);
    vi.mocked(eventsApi.listEvents).mockResolvedValue([culto]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra los avisos importantes aparte y los próximos eventos', async () => {
    renderAs('secretary');

    expect(await screen.findByText('Cambio de horario')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Avisos importantes' })).toBeTruthy();
    expect(await screen.findByText('Culto dominical')).toBeTruthy();
    expect(eventsApi.listEvents).toHaveBeenCalledWith({ from: '2026-11-02', status: 'scheduled' });
  });

  it('publica un comunicado con la fecha de hoy', async () => {
    vi.mocked(api.createAnnouncement).mockResolvedValue(aviso);
    renderAs('pastor');
    await screen.findByText('Cambio de horario');

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Vigilia' } });
    fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: 'Viernes 7 pm' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aviso importante' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    await waitFor(() => {
      expect(api.createAnnouncement).toHaveBeenCalledWith({
        title: 'Vigilia',
        body: 'Viernes 7 pm',
        important: true,
        publishedOn: '2026-11-02',
      });
    });
  });

  it('elimina un comunicado tras confirmar', async () => {
    vi.mocked(api.deleteAnnouncement).mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderAs('admin');
    await screen.findByText('Cambio de horario');

    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[1] as HTMLElement);
    await waitFor(() => {
      expect(api.deleteAnnouncement).toHaveBeenCalledWith('a2');
    });
  });

  it('el coordinador solo lee: sin formulario, sin botones y sin pedir eventos', async () => {
    renderAs('coordinator');

    expect(await screen.findByText('Cambio de horario')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Publicar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(eventsApi.listEvents).not.toHaveBeenCalled();
  });
});
