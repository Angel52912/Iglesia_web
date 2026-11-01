import { z } from 'zod';
import { emailSchema, phoneSchema } from '../members/members.schemas.js';

const nameSchema = z
  .string({ error: 'El nombre de la iglesia es obligatorio' })
  .trim()
  .min(1, 'El nombre de la iglesia es obligatorio')
  .max(120, 'El nombre es demasiado largo');

// Cadena vacía = sin dato: se guarda null.
const addressSchema = z
  .string()
  .trim()
  .max(250, 'La dirección es demasiado larga')
  .nullable()
  .transform((value) => (value === null || value === '' ? null : value));

export const updateSettingsSchema = z
  .object({
    name: nameSchema,
    address: addressSchema,
    phone: phoneSchema,
    email: emailSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { error: 'No hay cambios que guardar' });

const labelSchema = z
  .string({ error: 'La descripción es obligatoria' })
  .trim()
  .min(1, 'La descripción es obligatoria')
  .max(80, 'La descripción es demasiado larga');

// 0 = domingo ... 6 = sábado.
const weekdaySchema = z
  .number({ error: 'El día no es válido' })
  .int('El día no es válido')
  .min(0, 'El día no es válido')
  .max(6, 'El día no es válido');

const startTimeSchema = z
  .string({ error: 'La hora no es válida' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener formato HH:MM');

export const createScheduleSchema = z.object({
  label: labelSchema,
  weekday: weekdaySchema,
  startTime: startTimeSchema,
});

export const updateScheduleSchema = createScheduleSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { error: 'No hay cambios que guardar' });

export const scheduleIdSchema = z.uuid('Identificador no válido');
