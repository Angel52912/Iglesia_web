import { z } from 'zod';
import { DONATION_METHODS } from './donations.types.js';

const dateSchema = z.iso.date('La fecha no es válida');

// Dinero con a lo mucho 2 decimales y dentro del rango de numeric(12,2).
const amountSchema = z
  .number({ error: 'El monto debe ser un número' })
  .positive('El monto debe ser mayor que cero')
  .max(9_999_999_999.99, 'El monto es demasiado grande')
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
    error: 'El monto admite máximo 2 decimales',
  });

const conceptSchema = z
  .string({ error: 'El concepto es obligatorio' })
  .trim()
  .min(1, 'El concepto es obligatorio')
  .max(120, 'El concepto es demasiado largo');

const methodSchema = z.enum(DONATION_METHODS, { error: 'El método de recepción no es válido' });

// null = donación anónima.
const memberIdSchema = z.uuid('Miembro no válido').nullable();

export const createDonationSchema = z.object({
  memberId: memberIdSchema.default(null),
  donatedOn: dateSchema,
  amount: amountSchema,
  concept: conceptSchema,
  method: methodSchema,
});

export const updateDonationSchema = z
  .object({
    memberId: memberIdSchema,
    donatedOn: dateSchema,
    amount: amountSchema,
    concept: conceptSchema,
    method: methodSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { error: 'No hay cambios que guardar' });

export const listDonationsQuerySchema = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    memberId: z.uuid('Miembro no válido').optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    error: 'La fecha inicial no puede ser posterior a la final',
  });

export const summaryQuerySchema = z.object({
  month: z.string({ error: 'El mes es obligatorio' }).regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
    error: 'El mes debe tener formato AAAA-MM',
  }),
});

export const donationIdSchema = z.uuid('Identificador no válido');
