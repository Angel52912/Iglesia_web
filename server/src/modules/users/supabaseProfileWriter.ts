import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../../errors.js';
import type { NewProfile, ProfileWriter } from './users.types.js';

const UNIQUE_VIOLATION = '23505';

export class SupabaseProfileWriter implements ProfileWriter {
  constructor(private readonly admin: SupabaseClient) {}

  async insert(profile: NewProfile): Promise<void> {
    const { error } = await this.admin.from('profiles').insert({
      id: profile.id,
      email: profile.email.toLowerCase(),
      full_name: profile.fullName,
      role: profile.role,
    });
    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        throw new HttpError(409, 'Ya existe un usuario con ese correo');
      }
      throw new Error(`No se pudo crear el perfil: ${error.message}`);
    }
  }
}
