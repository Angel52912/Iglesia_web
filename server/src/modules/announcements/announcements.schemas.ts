import { z } from 'zod';

const titleSchema = z
  .string({ error: 'El título es obligatorio' })
  .trim()
  .min(1, 'El título es obligatorio')
  .max(120, 'El título es demasiado largo');

const bodySchema = z
  .string({ error: 'El mensaje es obligatorio' })
  .trim()
  .min(1, 'El mensaje es obligatorio')
  .max(2000, 'El mensaje es demasiado largo');

const importantSchema = z.boolean({ error: 'El campo importante no es válido' });
const dateSchema = z.iso.date('La fecha de publicación no es válida');

export const createAnnouncementSchema = z.object({
  title: titleSchema,
  body: bodySchema,
  important: importantSchema.default(false),
  publishedOn: dateSchema.optional(),
});

export const updateAnnouncementSchema = z
  .object({
    title: titleSchema,
    body: bodySchema,
    important: importantSchema,
    publishedOn: dateSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { error: 'No hay cambios que guardar' });

export const listAnnouncementsQuerySchema = z.object({
  important: z
    .enum(['true', 'false'], { error: 'El filtro importante no es válido' })
    .transform((value) => value === 'true')
    .optional(),
});

export const announcementIdSchema = z.uuid('Identificador no válido');
