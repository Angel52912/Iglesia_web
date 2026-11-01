import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from './env.js';

const noSession = { persistSession: false, autoRefreshToken: false } as const;

// Sin tipos generados todavía (db:types), el cliente queda con el esquema por defecto.
type Client = ReturnType<typeof createClient>;

export function createAnonClient(env: Pick<Env, 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'>): Client {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: noSession });
}

// Cliente con el JWT del usuario: RLS aplica como segunda capa de permisos.
export function createUserClient(
  env: Pick<Env, 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'>,
  accessToken: string,
): Client {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: noSession,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// service_role: solo servidor y solo para alta/bloqueo de usuarios.
export function createAdminClient(
  env: Pick<Env, 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'>,
): Client {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: noSession });
}

export type { SupabaseClient };
