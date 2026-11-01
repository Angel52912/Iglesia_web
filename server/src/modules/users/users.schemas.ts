import { z } from 'zod';
import { ROLES } from '../../types/auth.js';

const roleSchema = z.enum(ROLES, { error: 'Rol no válido' });
const fullNameSchema = z
  .string({ error: 'El nombre es obligatorio' })
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(120, 'El nombre es demasiado largo');

export const PASSWORD_MIN_LENGTH = 8;

export const createUserSchema = z.object({
  // Los correos se guardan siempre en minúsculas (unique(email) distingue mayúsculas).
  email: z
    .email('Correo no válido')
    .max(254, 'Correo no válido')
    .transform((value) => value.toLowerCase()),
  password: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(
      PASSWORD_MIN_LENGTH,
      `La contraseña debe tener al menos ${String(PASSWORD_MIN_LENGTH)} caracteres`,
    )
    .max(72, 'La contraseña no puede superar 72 caracteres'),
  fullName: fullNameSchema,
  role: roleSchema,
});

export const updateUserSchema = z
  .object({
    fullName: fullNameSchema,
    role: roleSchema,
    active: z.boolean({ error: 'El estado debe ser verdadero o falso' }),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { error: 'No hay cambios que guardar' });

export const userIdSchema = z.uuid('Identificador no válido');
