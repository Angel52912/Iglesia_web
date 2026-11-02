import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '../src/auth/roles';
import * as api from '../src/features/donations/api';
import { DonationsPage } from '../src/features/donations/DonationsPage';
import { WithAuth, authValue } from './authTestUtils';

vi.mock('../src/features/donations/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/features/donations/api')>();
  return {
    ...original,
    listDonations: vi.fn(),
    listDonors: vi.fn(),
    getDonationSummary: vi.fn(),
    createDonation: vi.fn(),
    updateDonation: vi.fn(),
    deleteDonation: vi.fn(),
  };
});

const diezmo: api.Donation = {
  id: 'd1',
  memberId: null,
  donorName: null,
  donatedOn: '2026-11-01',
  amount: 150.5,
  concept: 'Diezmo',
  method: 'cash',
};

const summary: api.DonationSummary = {
  month: '2026-11',
  from: '2026-11-01',
  to: '2026-11-30',
  total: 150.5,
  donations: 1,
  byMethod: [{ key: 'cash', total: 150.5, donations: 1 }],
  byConcept: [{ key: 'Diezmo', total: 150.5, donations: 1 }],
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
        <DonationsPage />
      </MemoryRouter>
    </WithAuth>,
  );
}

describe('DonationsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.getDonationSummary).mockResolvedValue(summary);
    vi.mocked(api.listDonations).mockResolvedValue({ donations: [diezmo], total: 150.5 });
    vi.mocked(api.listDonors).mockResolvedValue([{ id: 'm1', fullName: 'Ana Pérez' }]);
  });

  it('el tesorero registra una aportación anónima', async () => {
    vi.mocked(api.createDonation).mockResolvedValue(diezmo);
    renderAs('treasurer');

    expect(await screen.findByText('Resumen del mes')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '75.25' } });
    fireEvent.change(screen.getByLabelText('Concepto'), { target: { value: 'Ofrenda' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar aportación' }));

    await waitFor(() => {
      expect(api.createDonation).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: null,
          amount: 75.25,
          concept: 'Ofrenda',
          method: 'cash',
        }),
      );
    });
  });

  it('el tesorero ve el resumen por concepto', async () => {
    renderAs('treasurer');
    expect(await screen.findByText('Por concepto')).toBeTruthy();
  });

  it('el pastor solo ve el resumen: no consulta filas ni donantes y no hay formulario', async () => {
    vi.mocked(api.getDonationSummary).mockResolvedValue({ ...summary, byConcept: null });
    renderAs('pastor');

    expect(await screen.findByText('Resumen del mes')).toBeTruthy();
    expect(screen.getByText('Por método')).toBeTruthy();
    expect(screen.queryByText('Por concepto')).toBeNull();
    expect(api.listDonations).not.toHaveBeenCalled();
    expect(api.listDonors).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Registrar aportación' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull();
  });

  it('muestra el error del servidor al fallar el registro', async () => {
    vi.mocked(api.createDonation).mockRejectedValue(new Error('El monto debe ser mayor que cero'));
    renderAs('admin');

    await screen.findByText('Resumen del mes');
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Concepto'), { target: { value: 'Diezmo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar aportación' }));

    expect((await screen.findByRole('alert')).textContent).toBe('El monto debe ser mayor que cero');
  });
});
