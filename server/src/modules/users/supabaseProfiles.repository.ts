import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../../errors.js';
import { PROFILE_COLUMNS, profileRowSchema, type ProfileRow } from './profile.row.js';
import type { ProfilesRepository, UpdateUserInput, UserProfile } from './users.types.js';

function toUserProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    active: row.active,
    createdAt: row.created_at,
  };
}

export class SupabaseProfilesRepository implements ProfilesRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(): Promise<UserProfile[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .order('full_name');
    if (error) throw new Error(error.message);
    return profileRowSchema.array().parse(data).map(toUserProfile);
  }

  async findById(id: string): Promise<UserProfile | null> {
    const { data, error } = await this.db
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toUserProfile(profileRowSchema.parse(data)) : null;
  }

  async countActiveAdmins(): Promise<number> {
    const { count, error } = await this.db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('active', true);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  async update(id: string, patch: UpdateUserInput): Promise<UserProfile | null> {
    const changes: Record<string, string | boolean> = {};
    if (patch.fullName !== undefined) changes.full_name = patch.fullName;
    if (patch.role !== undefined) changes.role = patch.role;
    if (patch.active !== undefined) changes.active = patch.active;

    const { data, error } = await this.db
      .from('profiles')
      .update(changes)
      .eq('id', id)
      .select(PROFILE_COLUMNS)
      .maybeSingle();
    if (error) {
      // Trigger ensure_active_admin: segunda red de seguridad frente a cambios simultáneos.
      if (error.message.includes('last_active_admin')) {
        throw new HttpError(409, 'Debe quedar al menos un administrador activo');
      }
      throw new Error(error.message);
    }
    return data ? toUserProfile(profileRowSchema.parse(data)) : null;
  }
}
