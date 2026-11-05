export const PHONE_LENGTH = 10;

// Teléfono: solo dígitos, máximo 10.
export function toPhoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, PHONE_LENGTH);
}

// Nombre de persona: solo letras (con acentos) y espacios.
export function toLettersOnly(value: string): string {
  return value.replace(/[^\p{L}\p{M}\s]/gu, '');
}
