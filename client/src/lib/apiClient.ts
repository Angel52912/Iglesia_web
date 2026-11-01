import { getSupabase } from './supabaseClient';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  // Token explícito: evita pedir la sesión dentro de onAuthStateChange (puede bloquearse).
  token?: string;
}

function extractMessage(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  if ('details' in payload && Array.isArray(payload.details)) {
    const first: unknown = payload.details[0];
    if (typeof first === 'object' && first !== null && 'message' in first) {
      if (typeof first.message === 'string') return first.message;
    }
  }
  if ('error' in payload && typeof payload.error === 'string') return payload.error;
  return null;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token ?? (await getSupabase().auth.getSession()).data.session?.access_token;
  const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const init: RequestInit = { method: options.method ?? 'GET', headers };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, init);
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(payload) ?? 'Ocurrió un error inesperado');
  }
  return payload as T;
}
