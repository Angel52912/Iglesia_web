import type { SupabaseClient } from '@supabase/supabase-js';
import { toDbError } from '../shared/dbError.js';
import { MINISTRY_COLUMNS, ministryRowSchema, type MinistryRow } from './ministry.row.js';
import type {
  CreateMinistryInput,
  MemberRef,
  MinistriesRepository,
  Ministry,
  MinistryDetail,
  UpdateMinistryInput,
} from './ministries.types.js';

const DUPLICATED_NAME = 'Ya existe un ministerio con ese nombre';

type LinkTable = 'ministry_coordinators' | 'ministry_members';

function toRefs(links: MinistryRow['ministry_members']): MemberRef[] {
  const refs: MemberRef[] = [];
  for (const link of links) {
    if (link.members) refs.push({ id: link.members.id, fullName: link.members.full_name });
  }
  return refs.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

function toDetail(row: MinistryRow): MinistryDetail {
  const members = toRefs(row.ministry_members);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    active: row.active,
    coordinators: toRefs(row.ministry_coordinators),
    memberCount: members.length,
    members,
  };
}

function toSummary(row: MinistryRow): Ministry {
  const detail = toDetail(row);
  return {
    id: detail.id,
    name: detail.name,
    description: detail.description,
    active: detail.active,
    coordinators: detail.coordinators,
    memberCount: detail.memberCount,
  };
}

export class SupabaseMinistriesRepository implements MinistriesRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(): Promise<Ministry[]> {
    const { data, error } = await this.db.from('ministries').select(MINISTRY_COLUMNS).order('name');
    if (error) throw new Error(error.message);
    return ministryRowSchema.array().parse(data).map(toSummary);
  }

  async findById(id: string): Promise<MinistryDetail | null> {
    const { data, error } = await this.db
      .from('ministries')
      .select(MINISTRY_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toDetail(ministryRowSchema.parse(data)) : null;
  }

  async create(input: CreateMinistryInput): Promise<MinistryDetail> {
    const { data, error } = await this.db
      .from('ministries')
      .insert({ name: input.name, description: input.description })
      .select(MINISTRY_COLUMNS)
      .single();
    if (error) throw toDbError(error, DUPLICATED_NAME);
    return toDetail(ministryRowSchema.parse(data));
  }

  async update(id: string, patch: UpdateMinistryInput): Promise<MinistryDetail | null> {
    const changes: Record<string, string | boolean | null> = {};
    if (patch.name !== undefined) changes.name = patch.name;
    if (patch.description !== undefined) changes.description = patch.description;
    if (patch.active !== undefined) changes.active = patch.active;

    const { data, error } = await this.db
      .from('ministries')
      .update(changes)
      .eq('id', id)
      .select(MINISTRY_COLUMNS)
      .maybeSingle();
    if (error) throw toDbError(error, DUPLICATED_NAME);
    return data ? toDetail(ministryRowSchema.parse(data)) : null;
  }

  setCoordinators(id: string, memberIds: string[]): Promise<MinistryDetail | null> {
    return this.replaceLinks('ministry_coordinators', id, memberIds);
  }

  setMembers(id: string, memberIds: string[]): Promise<MinistryDetail | null> {
    return this.replaceLinks('ministry_members', id, memberIds);
  }

  // Agrega los nuevos y quita los que sobran; no toca a los que se quedan.
  private async replaceLinks(
    table: LinkTable,
    id: string,
    memberIds: string[],
  ): Promise<MinistryDetail | null> {
    if (!(await this.findById(id))) return null;

    const current = await this.db.from(table).select('member_id').eq('ministry_id', id);
    if (current.error) throw new Error(current.error.message);
    const existing = (current.data as { member_id: string }[]).map((row) => row.member_id);

    const toRemove = existing.filter((memberId) => !memberIds.includes(memberId));
    const toAdd = memberIds.filter((memberId) => !existing.includes(memberId));

    // Primero se agrega: si un miembro no existe falla antes de quitar a nadie.
    if (toAdd.length > 0) {
      const added = await this.db
        .from(table)
        .insert(toAdd.map((memberId) => ({ ministry_id: id, member_id: memberId })));
      if (added.error) throw toDbError(added.error);
    }
    if (toRemove.length > 0) {
      const removed = await this.db
        .from(table)
        .delete()
        .eq('ministry_id', id)
        .in('member_id', toRemove);
      if (removed.error) throw new Error(removed.error.message);
    }
    return this.findById(id);
  }
}
