import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

export function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new HttpError(500, 'missing_env', `${name} tanımlı değil`);
  return v;
}

export function adminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
}

// İsteği yapan kullanıcının yetkileriyle çalışan istemci (RLS geçerli).
export async function userClient(req: Request): Promise<{ client: SupabaseClient; userId: string }> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) throw new HttpError(401, 'unauthorized');
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, 'unauthorized');
  return { client, userId: data.user.id };
}

// Zamanlanmış görevler servis rolü anahtarıyla çağırır.
export function requireServiceRole(req: Request): void {
  const auth = req.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`) throw new HttpError(403, 'forbidden');
}

export function handler(fn: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    try {
      return await fn(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.code, message: e.message }, e.status);
      console.error(e);
      return json({ error: 'internal' }, 500);
    }
  };
}

export async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (res.status === 429) throw new HttpError(503, 'upstream_rate_limited');
    if (!res.ok) throw new HttpError(502, 'upstream_error', `${new URL(url).host} ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
