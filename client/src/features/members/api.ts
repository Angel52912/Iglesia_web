import { apiRequest } from '../../lib/apiClient';

export interface Member {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  joinedOn: string;
  active: boolean;
  createdAt: string;
}

export type ActiveFilter = 'all' | 'active' | 'inactive';

export interface MemberFilters {
  search: string;
  status: ActiveFilter;
}

export interface MemberPayload {
  fullName: string;
  phone: string;
  email: string;
  joinedOn: string;
}

export interface UpdateMemberPayload extends Partial<MemberPayload> {
  active?: boolean;
}

export async function listMembers(filters: MemberFilters): Promise<Member[]> {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.status !== 'all') params.set('active', String(filters.status === 'active'));
  const query = params.toString();
  const { members } = await apiRequest<{ members: Member[] }>(
    `/api/members${query ? `?${query}` : ''}`,
  );
  return members;
}

export async function createMember(payload: MemberPayload): Promise<Member> {
  const body = { ...payload, joinedOn: payload.joinedOn || undefined };
  const { member } = await apiRequest<{ member: Member }>('/api/members', {
    method: 'POST',
    body,
  });
  return member;
}

export async function updateMember(id: string, payload: UpdateMemberPayload): Promise<Member> {
  const { member } = await apiRequest<{ member: Member }>(`/api/members/${id}`, {
    method: 'PATCH',
    body: payload,
  });
  return member;
}
