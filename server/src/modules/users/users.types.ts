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

export interface NewProfile {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
}

// Acceso a public.profiles con el JWT del usuario (RLS aplica).
export interface ProfilesRepository {
  list(): Promise<UserProfile[]>;
  findById(id: string): Promise<UserProfile | null>;
  countActiveAdmins(): Promise<number>;
  update(id: string, patch: UpdateUserInput): Promise<UserProfile | null>;
}

// Alta de perfiles: solo con service_role (no hay política de INSERT para usuarios).
export interface ProfileWriter {
  insert(profile: NewProfile): Promise<void>;
}

// Operaciones de Supabase Auth que requieren service_role.
export interface AuthAdminPort {
  createUser(input: CreateUserInput): Promise<string>;
  deleteUser(id: string): Promise<void>;
  setRole(id: string, role: AppRole): Promise<void>;
  setBlocked(id: string, blocked: boolean): Promise<void>;
}
