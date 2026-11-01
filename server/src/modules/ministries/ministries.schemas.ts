import { z } from 'zod';

const nameSchema = z
  .string({ error: 'El nombre del ministerio es obligatorio' })
  .trim()
  .min(1, 'El nombre del ministerio es obligatorio')
  .max(80, 'El nombre es demasiado largo');

// Cadena vacía = sin dato: se guarda null.
const descriptionSchema = z
  .string()
  .trim()
  .max(500, 'La descripción es demasiado larga')
  .nullable()
  .transform((value) => (value === null || value === '' ? null : value));

export const createMinistrySchema = z.object({
  name: nameSchema,
  description: descriptionSchema.default(null),
});

export const updateMinistrySchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema,
    active: z.boolean({ error: 'El estado debe ser verdadero o falso' }),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { error: 'No hay cambios que guardar' });

export const memberIdsSchema = z.object({
  memberIds: z
    .array(z.uuid('Identificador de miembro no válido'), {
      error: 'La lista de miembros no es válida',
    })
    .max(500, 'Demasiados miembros')
    // Un miembro repetido no debe romper la llave primaria.
    .transform((ids) => [...new Set(ids)]),
});

export const ministryIdSchema = z.uuid('Identificador no válido');
