import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../../errors.js';
import type { AppRole } from '../../types/auth.js';
import type { AuthAdminPort, CreateUserInput } from './users.types.js';

// Bloqueo prácticamente permanente (~100 años); 'none' lo levanta.
const BLOCKED_DURATION = '876000h';

export class SupabaseAuthAdmin implements AuthAdminPort {
  constructor(private readonly admin: SupabaseClient) {}

  async createUser(input: CreateUserInput): Promise<string> {
    const { data, error } = await this.admin.auth.admin.createUser({
      email: input.email.toLowerCase(),
      password: input.password,
      email_confirm: true,
      // El rol de verdad vive en public.profiles; en app_metadata (no editable por el
      // usuario) queda como respaldo y se mantiene sincronizado en setRole.
      app_metadata: { role: input.role },
      user_metadata: { full_name: input.fullName },
    });
    if (error) {
      if (error.code === 'email_exists') {
        throw new HttpError(409, 'Ya existe un usuario con ese correo');
      }
      // Solo el mensaje de Auth; nunca el objeto de entrada (lleva la contraseña).
      throw new Error(`No se pudo crear el usuario: ${error.message}`);
    }
    return data.user.id;
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await this.admin.auth.admin.deleteUser(id);
    if (error) throw new Error(`No se pudo borrar el usuario en Auth: ${error.message}`);
  }

  async setRole(id: string, role: AppRole): Promise<void> {
    const { error } = await this.admin.auth.admin.updateUserById(id, { app_metadata: { role } });
    if (error) throw new Error(`No se pudo actualizar el rol en Auth: ${error.message}`);
  }

  async setBlocked(id: string, blocked: boolean): Promise<void> {
    const { error } = await this.admin.auth.admin.updateUserById(id, {
      ban_duration: blocked ? BLOCKED_DURATION : 'none',
    });
    if (error) throw new Error(`No se pudo actualizar el bloqueo en Auth: ${error.message}`);
  }
}
