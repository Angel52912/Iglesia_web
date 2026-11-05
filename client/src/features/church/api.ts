import { apiRequest } from '../../lib/apiClient';

// Datos de la iglesia visibles para cualquier usuario con sesión.
export interface ChurchInfo {
  name: string;
  address: string | null;
  email: string | null;
  logoUrl: string | null;
}

export async function getChurchInfo(): Promise<ChurchInfo> {
  const { church } = await apiRequest<{ church: ChurchInfo }>('/api/church');
  return church;
}
