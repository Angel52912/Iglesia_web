import type { AppRole } from '../../types/auth.js';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  active: boolean;
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: AppRole;
}

export interface UpdateUserInput {
  fullName?: string | undefined;
  role?: AppRole | undefined;
  active?: boolean | undefined;
}

// Acceso a public.profiles con el JWT del usuario (RLS aplica).
export interface ProfilesRepository {
  list(): Promise<UserProfile[]>;
  findById(id: string): Promise<UserProfile | null>;
  countActiveAdmins(): Promise<number>;
  update(id: string, patch: UpdateUserInput): Promise<UserProfile | null>;
}

// Operaciones de Supabase Auth que requieren service_role.
export interface AuthAdminPort {
  createUser(input: CreateUserInput): Promise<string>;
  setRole(id: string, role: AppRole): Promise<void>;
  setBlocked(id: string, blocked: boolean): Promise<void>;
}
