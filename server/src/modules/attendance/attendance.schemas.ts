import { z } from 'zod';
import { REPORT_PERIODS } from './attendance.types.js';

const dateSchema = z.iso.date('La fecha no es válida');

export const attendanceEventIdSchema = z.uuid('Identificador no válido');

export const saveAttendanceSchema = z.object({
  records: z
    .array(
      z.object({
        memberId: z.uuid('Identificador de miembro no válido'),
        present: z.boolean({ error: 'La asistencia debe ser presente o ausente' }),
      }),
      { error: 'La lista de asistencia no es válida' },
    )
    .min(1, 'Marca al menos un miembro')
    .max(1000, 'Demasiados miembros en una sola lista')
    .refine((list) => new Set(list.map((item) => item.memberId)).size === list.length, {
      error: 'Hay miembros repetidos en la lista',
    }),
});

export const historyQuerySchema = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    eventId: z.uuid('Evento no válido').optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    error: 'La fecha inicial no puede ser posterior a la final',
  });

export const reportQuerySchema = z.object({
  period: z.enum(REPORT_PERIODS, { error: 'El periodo debe ser week o month' }),
  date: dateSchema,
});
