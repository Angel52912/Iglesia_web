export interface MemberRef {
  id: string;
  fullName: string;
}

export interface Ministry {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  coordinators: MemberRef[];
  memberCount: number;
}

export interface MinistryDetail extends Ministry {
  members: MemberRef[];
}

export interface CreateMinistryInput {
  name: string;
  description: string | null;
}

export interface UpdateMinistryInput {
  name?: string | undefined;
  description?: string | null | undefined;
  active?: boolean | undefined;
}

// Acceso a ministries, ministry_coordinators y ministry_members con el JWT del usuario (RLS aplica).
export interface MinistriesRepository {
  list(): Promise<Ministry[]>;
  findById(id: string): Promise<MinistryDetail | null>;
  create(input: CreateMinistryInput): Promise<MinistryDetail>;
  update(id: string, patch: UpdateMinistryInput): Promise<MinistryDetail | null>;
  // Reemplazan la lista completa. Devuelven null si el ministerio no existe.
  setCoordinators(id: string, memberIds: string[]): Promise<MinistryDetail | null>;
  setMembers(id: string, memberIds: string[]): Promise<MinistryDetail | null>;
}
