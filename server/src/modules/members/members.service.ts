import { HttpError } from '../../errors.js';
import type {
  CreateMemberInput,
  Member,
  MemberFilters,
  MembersRepository,
  UpdateMemberInput,
} from './members.types.js';

export class MembersService {
  constructor(private readonly members: MembersRepository) {}

  list(filters: MemberFilters): Promise<Member[]> {
    return this.members.list(filters);
  }

  create(input: CreateMemberInput): Promise<Member> {
    return this.members.create(input);
  }

  // Los miembros no se eliminan: desactivar = update({ active: false }).
  async update(id: string, patch: UpdateMemberInput): Promise<Member> {
    const updated = await this.members.update(id, patch);
    if (!updated) {
      throw new HttpError(404, 'Miembro no encontrado');
    }
    return updated;
  }
}
