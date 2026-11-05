import { z } from 'zod';

// Nombre de persona: solo letras (con acentos) separadas por espacios.
export const fullNameSchema = z
  .string({ error: 'El nombre es obligatorio' })
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(120, 'El nombre es demasiado largo')
  .regex(/^[\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+)*$/u, 'El nombre solo puede tener letras y espacios');

// Cadena vacía = sin dato: los campos opcionales se guardan como null.
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\d{10})?$/, 'El teléfono debe tener exactamente 10 números')
  .nullable()
  .transform((value) => (value === null || value === '' ? null : value));

export const emailSchema = z
  .string()
  .trim()
  .max(254, 'Correo no válido')
  .refine((value) => value === '' || z.email().safeParse(value).success, 'Correo no válido')
  .nullable()
  .transform((value) => (value === null || value === '' ? null : value.toLowerCase()));

const joinedOnSchema = z.iso.date('La fecha de ingreso no es válida');

export const createMemberSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema.default(null),
  email: emailSchema.default(null),
  joinedOn: joinedOnSchema.optional(),
});

export const updateMemberSchema = z
  .object({
    fullName: fullNameSchema,
    phone: phoneSchema,
    email: emailSchema,
    joinedOn: joinedOnSchema,
    active: z.boolean({ error: 'El estado debe ser verdadero o falso' }),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { error: 'No hay cambios que guardar' });

export const listMembersQuerySchema = z.object({
  search: z.string().trim().max(120, 'La búsqueda es demasiado larga').optional(),
  active: z
    .enum(['true', 'false'], { error: 'El filtro de estado no es válido' })
    .transform((value) => value === 'true')
    .optional(),
});

export const memberIdSchema = z.uuid('Identificador no válido');
