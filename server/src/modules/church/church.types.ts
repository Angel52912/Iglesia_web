// Datos de la iglesia visibles para cualquier usuario con sesión.
export interface ChurchPublicInfo {
  name: string;
  address: string | null;
  email: string | null;
  logoUrl: string | null;
}

export interface ChurchRepository {
  getPublicInfo(): Promise<ChurchPublicInfo>;
}
