export interface Member {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  joinedOn: string;
  active: boolean;
  createdAt: string;
}

export interface MemberFilters {
  search?: string | undefined;
  active?: boolean | undefined;
}

export interface CreateMemberInput {
  fullName: string;
  phone: string | null;
  email: string | null;
  joinedOn?: string | undefined;
}

export interface UpdateMemberInput {
  fullName?: string | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  joinedOn?: string | undefined;
  active?: boolean | undefined;
}

// Acceso a public.members con el JWT del usuario (RLS aplica).
export interface MembersRepository {
  list(filters: MemberFilters): Promise<Member[]>;
  create(input: CreateMemberInput): Promise<Member>;
  update(id: string, patch: UpdateMemberInput): Promise<Member | null>;
}
