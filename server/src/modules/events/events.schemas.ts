import { z } from 'zod';
import { todayIso } from '../shared/today.js';
import { EVENT_CATEGORIES, EVENT_STATUSES, EVENT_TYPES } from './events.types.js';

const titleSchema = z
  .string({ error: 'El título es obligatorio' })
  .trim()
  .min(1, 'El título es obligatorio')
  .max(120, 'El título es demasiado largo');

// Cadena vacía = sin dato: se guarda null.
function optionalText(max: number, tooLong: string) {
  return z
    .string()
    .trim()
    .max(max, tooLong)
    .nullable()
    .transform((value) => (value === null || value === '' ? null : value));
}

const descriptionSchema = optionalText(1000, 'La descripción es demasiado larga');
const locationSchema = optionalText(150, 'El lugar es demasiado largo');

const dateSchema = z.iso.date('La fecha no es válida');

const timeSchema = z
  .string({ error: 'La hora no es válida' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener formato HH:MM');

const typeSchema = z.enum(EVENT_TYPES, { error: 'El tipo de evento no es válido' });
const categorySchema = z.enum(EVENT_CATEGORIES, { error: 'La categoría no es válida' });
const statusSchema = z.enum(EVENT_STATUSES, { error: 'El estado no es válido' });

const ministryIdSchema = z.uuid('Ministerio no válido').nullable();

const responsibleIdsSchema = z
  .array(z.uuid('Identificador de responsable no válido'), {
    error: 'La lista de responsables no es válida',
  })
  .max(50, 'Demasiados responsables')
  // Un responsable repetido no debe romper la llave primaria.
  .transform((ids) => [...new Set(ids)]);

// Solo al crear: hoy o futuro. Editar un evento pasado (p. ej. corregir un dato) sigue permitido.
export const createEventSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema.default(null),
    eventDate: dateSchema,
    startTime: timeSchema,
    location: locationSchema.default(null),
    type: typeSchema,
    category: categorySchema,
    ministryId: ministryIdSchema.default(null),
    responsibleIds: responsibleIdsSchema.default([]),
  })
  .refine((value) => value.eventDate >= todayIso(), {
    path: ['eventDate'],
    error: 'No se pueden crear eventos en fechas anteriores a hoy',
  });

export const updateEventSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema,
    eventDate: dateSchema,
    startTime: timeSchema,
    location: locationSchema,
    type: typeSchema,
    category: categorySchema,
    status: statusSchema,
    ministryId: ministryIdSchema,
    responsibleIds: responsibleIdsSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { error: 'No hay cambios que guardar' });

export const listEventsQuerySchema = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    status: statusSchema.optional(),
    ministryId: z.uuid('Ministerio no válido').optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    error: 'La fecha inicial no puede ser posterior a la final',
  });

export const eventIdSchema = z.uuid('Identificador no válido');
