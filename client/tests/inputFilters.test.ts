import { describe, expect, it } from 'vitest';
import { toLettersOnly, toPhoneDigits } from '../src/lib/inputFilters';

describe('toPhoneDigits', () => {
  it('quita lo que no es número y corta a 10', () => {
    expect(toPhoneDigits('(555) 123-4567 89')).toBe('5551234567');
    expect(toPhoneDigits('abc')).toBe('');
  });
});

describe('toLettersOnly', () => {
  it('deja letras con acentos y espacios', () => {
    expect(toLettersOnly('José Ñandú 2_!')).toBe('José Ñandú ');
  });
});
