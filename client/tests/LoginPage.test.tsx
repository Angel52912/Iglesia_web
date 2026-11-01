import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../src/pages/LoginPage';
import { WithAuth, authValue } from './authTestUtils';

function renderLogin(value = authValue()): void {
  render(
    <WithAuth value={value}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Inicio</p>} />
        </Routes>
      </MemoryRouter>
    </WithAuth>,
  );
}

function fillAndSubmit(email: string, password: string): void {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } });
  fireEvent.submit(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('LoginPage', () => {
  it('muestra los campos y el enlace para recuperar la contraseña', () => {
    renderLogin();
    expect(screen.getByLabelText('Correo electrónico')).toBeTruthy();
    expect(screen.getByLabelText('Contraseña')).toBeTruthy();
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toBeTruthy();
  });

  it('envía el correo (sin espacios) y la contraseña', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    renderLogin(authValue({ signIn }));

    fillAndSubmit('  pastor@iglesia.test ', 'ClaveSegura123');

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('pastor@iglesia.test', 'ClaveSegura123');
    });
  });

  it('muestra el error cuando las credenciales son incorrectas', async () => {
    const signIn = vi.fn().mockRejectedValue(new Error('Correo o contraseña incorrectos'));
    renderLogin(authValue({ signIn }));

    fillAndSubmit('pastor@iglesia.test', 'mala');

    expect((await screen.findByRole('alert')).textContent).toBe('Correo o contraseña incorrectos');
  });

  it('muestra el motivo si la cuenta fue rechazada (por ejemplo, desactivada)', () => {
    renderLogin(authValue({ message: 'Tu cuenta está desactivada' }));
    expect(screen.getByRole('alert').textContent).toBe('Tu cuenta está desactivada');
  });

  it('redirige al inicio si ya hay sesión', () => {
    renderLogin(
      authValue({
        status: 'authenticated',
        user: { id: '1', email: 'a@b.c', fullName: 'Ana', role: 'admin' },
      }),
    );
    expect(screen.getByText('Inicio')).toBeTruthy();
  });
});
