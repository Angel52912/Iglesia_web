import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../src/features/settings/api';
import { SettingsPage } from '../src/features/settings/SettingsPage';

vi.mock('../src/features/settings/api');

const settings: api.ChurchSettings = {
  name: 'Iglesia Central',
  address: 'Calle 1',
  phone: null,
  email: null,
  logoUrl: null,
  schedules: [{ id: 's1', label: 'Culto dominical', weekday: 0, startTime: '10:00' }],
};

function renderPage(): void {
  render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.getSettings).mockResolvedValue(settings);
  });

  it('muestra los datos y los horarios actuales', async () => {
    renderPage();
    expect(await screen.findByDisplayValue('Iglesia Central')).toBeTruthy();
    expect(screen.getByText('Culto dominical')).toBeTruthy();
    expect(screen.getByText('Domingo a las 10:00')).toBeTruthy();
  });

  it('guarda los datos editados', async () => {
    vi.mocked(api.updateSettings).mockResolvedValue({ ...settings, name: 'Nueva Iglesia' });
    renderPage();

    fireEvent.change(await screen.findByLabelText('Nombre de la iglesia'), {
      target: { value: 'Nueva Iglesia' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar datos' }));

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenCalledWith({
        name: 'Nueva Iglesia',
        address: 'Calle 1',
        phone: '',
        email: '',
      });
    });
    expect(await screen.findByText('Datos guardados')).toBeTruthy();
  });

  it('agrega y elimina horarios', async () => {
    vi.mocked(api.createSchedule).mockResolvedValue({
      id: 's2',
      label: 'Oración',
      weekday: 0,
      startTime: '10:00',
    });
    vi.mocked(api.deleteSchedule).mockResolvedValue();
    renderPage();

    fireEvent.change(await screen.findByLabelText('Descripción'), {
      target: { value: 'Oración' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar horario' }));
    await waitFor(() => {
      expect(api.createSchedule).toHaveBeenCalledWith({
        label: 'Oración',
        weekday: 0,
        startTime: '10:00',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => {
      expect(api.deleteSchedule).toHaveBeenCalledWith('s1');
    });
  });

  it('muestra el error del servidor al guardar', async () => {
    vi.mocked(api.updateSettings).mockRejectedValue(new Error('Correo no válido'));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Guardar datos' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Correo no válido');
  });
});
