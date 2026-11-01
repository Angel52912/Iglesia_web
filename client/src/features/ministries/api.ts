import { apiRequest } from '../../lib/apiClient';

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

export interface MinistryPayload {
  name: string;
  description: string;
}

export async function listMinistries(): Promise<Ministry[]> {
  const { ministries } = await apiRequest<{ ministries: Ministry[] }>('/api/ministries');
  return ministries;
}

export async function getMinistry(id: string): Promise<MinistryDetail> {
  const { ministry } = await apiRequest<{ ministry: MinistryDetail }>(`/api/ministries/${id}`);
  return ministry;
}

export async function createMinistry(payload: MinistryPayload): Promise<MinistryDetail> {
  const { ministry } = await apiRequest<{ ministry: MinistryDetail }>('/api/ministries', {
    method: 'POST',
    body: payload,
  });
  return ministry;
}

export async function updateMinistry(
  id: string,
  payload: Partial<MinistryPayload> & { active?: boolean },
): Promise<MinistryDetail> {
  const { ministry } = await apiRequest<{ ministry: MinistryDetail }>(`/api/ministries/${id}`, {
    method: 'PATCH',
    body: payload,
  });
  return ministry;
}

export async function setCoordinators(id: string, memberIds: string[]): Promise<MinistryDetail> {
  const { ministry } = await apiRequest<{ ministry: MinistryDetail }>(
    `/api/ministries/${id}/coordinators`,
    { method: 'PUT', body: { memberIds } },
  );
  return ministry;
}

export async function setMembers(id: string, memberIds: string[]): Promise<MinistryDetail> {
  const { ministry } = await apiRequest<{ ministry: MinistryDetail }>(
    `/api/ministries/${id}/members`,
    { method: 'PUT', body: { memberIds } },
  );
  return ministry;
}
