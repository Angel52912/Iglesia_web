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
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  // Archivo como cuerpo binario (se envía con su propio Content-Type); no se combina con body.
  file?: File;
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

  if (options.file) headers['Content-Type'] = options.file.type;

  const init: RequestInit = { method: options.method ?? 'GET', headers };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  if (options.file) init.body = options.file;

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

export interface DownloadedFile {
  blob: Blob;
  filename: string;
}

// Descarga un archivo (PDF, Excel) con el token del usuario; el nombre viene de Content-Disposition.
export async function apiDownload(path: string): Promise<DownloadedFile> {
  const token = (await getSupabase().auth.getSession()).data.session?.access_token;
  const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { headers });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, extractMessage(payload) ?? 'Ocurrió un error inesperado');
  }
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'reporte';
  return { blob: await response.blob(), filename };
}
