import type { SupabaseClient } from '@supabase/supabase-js';
import { MEMBER_COLUMNS, memberRowSchema, type MemberRow } from './member.row.js';
import type {
  CreateMemberInput,
  Member,
  MemberFilters,
  MembersRepository,
  UpdateMemberInput,
} from './members.types.js';

function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    joinedOn: row.joined_on,
    active: row.active,
    createdAt: row.created_at,
  };
}

// En ilike, % _ y \ son comodines: se escapan para buscar el texto literal.
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export class SupabaseMembersRepository implements MembersRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(filters: MemberFilters): Promise<Member[]> {
    let query = this.db.from('members').select(MEMBER_COLUMNS).order('full_name');
    if (filters.search) {
      query = query.ilike('full_name', `%${escapeLike(filters.search)}%`);
    }
    if (filters.active !== undefined) {
      query = query.eq('active', filters.active);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return memberRowSchema.array().parse(data).map(toMember);
  }

  async create(input: CreateMemberInput): Promise<Member> {
    const row: Record<string, string | null> = {
      full_name: input.fullName,
      phone: input.phone,
      email: input.email,
    };
    if (input.joinedOn !== undefined) row.joined_on = input.joinedOn;

    const { data, error } = await this.db
      .from('members')
      .insert(row)
      .select(MEMBER_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return toMember(memberRowSchema.parse(data));
  }

  async update(id: string, patch: UpdateMemberInput): Promise<Member | null> {
    const changes: Record<string, string | boolean | null> = {};
    if (patch.fullName !== undefined) changes.full_name = patch.fullName;
    if (patch.phone !== undefined) changes.phone = patch.phone;
    if (patch.email !== undefined) changes.email = patch.email;
    if (patch.joinedOn !== undefined) changes.joined_on = patch.joinedOn;
    if (patch.active !== undefined) changes.active = patch.active;

    const { data, error } = await this.db
      .from('members')
      .update(changes)
      .eq('id', id)
      .select(MEMBER_COLUMNS)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toMember(memberRowSchema.parse(data)) : null;
  }
}
