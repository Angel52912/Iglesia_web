import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app/App';

describe('App', () => {
  it('muestra el título', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Gestión de Iglesia' })).toBeTruthy();
  });
});
