import type { Env } from '../../config/env.js';
import { createAnonClient, createUserClient } from '../../config/supabase.js';
import type { AuthResult, Authenticator } from '../../types/auth.js';
import { PROFILE_COLUMNS, profileRowSchema } from '../users/profile.row.js';

type SupabaseEnv = Pick<Env, 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'>;

export class SupabaseAuthenticator implements Authenticator {
  constructor(private readonly env: SupabaseEnv) {}

  async authenticate(token: string): Promise<AuthResult> {
    const { data, error } = await createAnonClient(this.env).auth.getUser(token);
    if (error) {
      return { status: 'invalid' };
    }

    // Rol y estado salen de public.profiles en CADA petición, nunca de los claims del token
    // (app_metadata puede quedar desactualizado al cambiar el rol o desactivar al usuario).
    const { data: row, error: profileError } = await createUserClient(this.env, token)
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', data.user.id)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    const profile = profileRowSchema.nullable().parse(row);
    if (!profile) {
      return { status: 'invalid' };
    }
    if (!profile.active) {
      return { status: 'inactive' };
    }
    return {
      status: 'ok',
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
      },
    };
  }
}
