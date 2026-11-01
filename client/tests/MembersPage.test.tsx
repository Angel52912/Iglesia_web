import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '../src/auth/roles';
import * as api from '../src/features/members/api';
import { MembersPage } from '../src/features/members/MembersPage';
import { WithAuth, authValue } from './authTestUtils';

vi.mock('../src/features/members/api');

const ana: api.Member = {
  id: '1',
  fullName: 'Ana Pérez',
  phone: '555 123',
  email: 'ana@correo.com',
  joinedOn: '2026-05-10',
  active: true,
  createdAt: '2026-05-10T00:00:00Z',
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
        <MembersPage />
      </MemoryRouter>
    </WithAuth>,
  );
}

describe('MembersPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.listMembers).mockResolvedValue([ana]);
  });

  it('el secretario ve el formulario y puede desactivar', async () => {
    vi.mocked(api.updateMember).mockResolvedValue({ ...ana, active: false });
    renderAs('secretary');

    expect(await screen.findByText('Ana Pérez')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Registrar miembro' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => {
      expect(api.updateMember).toHaveBeenCalledWith('1', { active: false });
    });
  });

  it('el pastor solo consulta: sin formulario ni botones de cambio', async () => {
    renderAs('pastor');

    expect(await screen.findByText('Ana Pérez')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Registrar miembro' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Desactivar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
  });

  it('muestra el error del servidor', async () => {
    vi.mocked(api.listMembers).mockRejectedValue(new Error('No tienes permiso'));
    renderAs('secretary');

    expect((await screen.findByRole('alert')).textContent).toContain('No tienes permiso');
  });
});
