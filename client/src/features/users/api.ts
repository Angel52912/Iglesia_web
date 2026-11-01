import { apiRequest } from '../../lib/apiClient';
import type { Role } from '../../auth/roles';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}

export interface UpdateUserPayload {
  fullName?: string;
  role?: Role;
  active?: boolean;
}

export async function listUsers(): Promise<UserProfile[]> {
  const { users } = await apiRequest<{ users: UserProfile[] }>('/api/users');
  return users;
}

export async function createUser(payload: CreateUserPayload): Promise<UserProfile> {
  const { user } = await apiRequest<{ user: UserProfile }>('/api/users', {
    method: 'POST',
    body: payload,
  });
  return user;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<UserProfile> {
  const { user } = await apiRequest<{ user: UserProfile }>(`/api/users/${id}`, {
    method: 'PATCH',
    body: payload,
  });
  return user;
}
