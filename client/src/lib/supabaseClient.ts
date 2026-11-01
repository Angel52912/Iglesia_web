import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

// Solo se usa para autenticación (login, logout, recuperar contraseña). Los datos van por la API.
export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error('Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
    }
    client = createClient(url, anonKey);
  }
  return client;
}
