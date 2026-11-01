import { z } from 'zod';

const fullNameSchema = z
  .string({ error: 'El nombre es obligatorio' })
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(120, 'El nombre es demasiado largo');

// Cadena vacía = sin dato: los campos opcionales se guardan como null.
const phoneSchema = z
  .string()
  .trim()
  .max(30, 'El teléfono es demasiado largo')
  .regex(/^[0-9+()\-\s]*$/, 'El teléfono solo puede tener números, espacios, + ( ) y -')
  .nullable()
  .transform((value) => (value === null || value === '' ? null : value));

const emailSchema = z
  .union([z.literal(''), z.email('Correo no válido').max(254, 'Correo no válido')])
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
