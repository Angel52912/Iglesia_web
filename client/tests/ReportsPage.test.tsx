import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '../src/auth/roles';
import * as api from '../src/features/reports/api';
import { ReportsPage } from '../src/features/reports/ReportsPage';
import { WithAuth, authValue } from './authTestUtils';

vi.mock('../src/features/reports/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/features/reports/api')>();
  return { ...original, fetchReport: vi.fn(), downloadReport: vi.fn() };
});

const membersReport: api.ReportTable = {
  slug: 'miembros',
  title: 'Reporte general de miembros',
  subtitle: 'Todos los miembros',
  columns: [
    { header: 'Nombre', kind: 'text' },
    { header: 'Teléfono', kind: 'text' },
  ],
  rows: [['Ana Pérez', null]],
  summary: [{ label: 'Total de miembros', value: '1' }],
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
        <ReportsPage />
      </MemoryRouter>
    </WithAuth>,
  );
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('genera el reporte y permite exportarlo a PDF y Excel', async () => {
    vi.mocked(api.fetchReport).mockResolvedValue(membersReport);
    vi.mocked(api.downloadReport).mockResolvedValue();
    renderAs('secretary');

    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte' }));
    expect(await screen.findByText('Reporte general de miembros')).toBeTruthy();
    expect(screen.getByText('Ana Pérez')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Exportar a PDF' }));
    await waitFor(() => {
      expect(api.downloadReport).toHaveBeenCalledWith('members', expect.anything(), 'pdf');
    });
    // Mientras exporta los botones se deshabilitan; se espera a que terminen.
    await waitFor(() => {
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Exportar a Excel' }).disabled,
      ).toBe(false);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Exportar a Excel' }));
    await waitFor(() => {
      expect(api.downloadReport).toHaveBeenCalledWith('members', expect.anything(), 'xlsx');
    });
  });

  it('cada rol solo ve los reportes que le corresponden', () => {
    renderAs('treasurer');
    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['Ingresos por periodo']);
  });

  it('el coordinador no tiene reportes disponibles', () => {
    renderAs('coordinator');
    expect(screen.getByText('Tu rol no tiene reportes disponibles.')).toBeTruthy();
  });

  it('muestra el error del servidor', async () => {
    vi.mocked(api.fetchReport).mockRejectedValue(new Error('No tienes permiso'));
    renderAs('admin');

    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte' }));
    expect(await screen.findByText('No tienes permiso')).toBeTruthy();
  });
});
