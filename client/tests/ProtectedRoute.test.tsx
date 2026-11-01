import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ProtectedRoute } from '../src/auth/ProtectedRoute';
import { ROLES, type Role } from '../src/auth/roles';
import { WithAuth, authValue } from './authTestUtils';

function renderRoute(value = authValue(), roles?: readonly Role[]): void {
  render(
    <WithAuth value={value}>
      <MemoryRouter initialEntries={['/privada']}>
        <Routes>
          <Route path="/login" element={<p>Pantalla de login</p>} />
          <Route
            path="/privada"
            element={
              <ProtectedRoute {...(roles ? { roles } : {})}>
                <p>Contenido privado</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </WithAuth>,
  );
}

function sessionAs(role: Role): ReturnType<typeof authValue> {
  return authValue({
    status: 'authenticated',
    user: { id: '1', email: 'a@b.c', fullName: 'Ana', role },
  });
}

describe('ProtectedRoute', () => {
  it('muestra "Cargando" mientras se verifica la sesión', () => {
    renderRoute(authValue({ status: 'loading' }));
    expect(screen.getByText('Cargando…')).toBeTruthy();
    expect(screen.queryByText('Contenido privado')).toBeNull();
  });

  it('manda al login a quien no tiene sesión', () => {
    renderRoute();
    expect(screen.getByText('Pantalla de login')).toBeTruthy();
    expect(screen.queryByText('Contenido privado')).toBeNull();
  });

  it('deja pasar a cualquier rol cuando no se piden roles', () => {
    renderRoute(sessionAs('coordinator'));
    expect(screen.getByText('Contenido privado')).toBeTruthy();
  });

  it('deja pasar al rol permitido', () => {
    renderRoute(sessionAs('admin'), ['admin']);
    expect(screen.getByText('Contenido privado')).toBeTruthy();
  });

  it.each(ROLES.filter((role) => role !== 'admin'))(
    'bloquea la vista de admin al rol %s',
    (role) => {
      renderRoute(sessionAs(role), ['admin']);
      expect(screen.getByRole('alert').textContent).toContain('No tienes permiso');
      expect(screen.queryByText('Contenido privado')).toBeNull();
    },
  );
});
