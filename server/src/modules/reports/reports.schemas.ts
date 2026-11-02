import { z } from 'zod';
import { MEMBER_STATUSES, REPORT_FORMATS } from './reports.types.js';

const MAX_PERIOD_DAYS = 731;
const DAY_MS = 86_400_000;

const dateSchema = z.iso.date('La fecha no es válida');
const formatSchema = z
  .enum(REPORT_FORMATS, { error: 'El formato debe ser json, pdf o xlsx' })
  .default('json');

export const membersReportQuerySchema = z.object({
  status: z.enum(MEMBER_STATUSES, { error: 'El estado no es válido' }).default('all'),
  format: formatSchema,
});

export const periodReportQuerySchema = z
  .object({
    from: dateSchema,
    to: dateSchema,
    format: formatSchema,
  })
  .refine((value) => value.from <= value.to, {
    error: 'La fecha inicial no puede ser posterior a la final',
  })
  .refine(
    (value) =>
      (Date.parse(`${value.to}T00:00:00Z`) - Date.parse(`${value.from}T00:00:00Z`)) / DAY_MS <=
      MAX_PERIOD_DAYS,
    { error: 'El periodo no puede ser mayor a 2 años' },
  );

export const ministriesReportQuerySchema = z.object({
  format: formatSchema,
});
