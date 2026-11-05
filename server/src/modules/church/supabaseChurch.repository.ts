import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { ChurchPublicInfo, ChurchRepository } from './church.types.js';

const BUCKET = 'church-assets';

const rowSchema = z.object({
  name: z.string(),
  address: z.string().nullable(),
  email: z.string().nullable(),
  logo_path: z.string().nullable(),
});

// Lee con la función church_public_info() (security definer): no abre church_settings a otros roles.
export class SupabaseChurchRepository implements ChurchRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getPublicInfo(): Promise<ChurchPublicInfo> {
    const result = await this.db.rpc('church_public_info');
    if (result.error) throw new Error(result.error.message);
    const [row] = rowSchema.array().parse(result.data as unknown);
    if (!row) throw new Error('No hay datos de la iglesia');
    return {
      name: row.name,
      address: row.address,
      email: row.email,
      logoUrl: row.logo_path
        ? this.db.storage.from(BUCKET).getPublicUrl(row.logo_path).data.publicUrl
        : null,
    };
  }
}
