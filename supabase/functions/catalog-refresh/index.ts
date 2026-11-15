// Zamanlanmış görev (servis rolü): TMDB verisini 6 aylık önbellek sınırı dolmadan yeniler.
// POST { older_than_days?: number, limit?: number }
import { adminClient, handler, json, requireServiceRole } from '../_shared/http.ts';
import { refreshMedia } from '../_shared/refresh.ts';

Deno.serve(handler(async (req) => {
  requireServiceRole(req);
  const body = await req.json().catch(() => ({}));
  const days = Math.max(1, Math.min(170, Number(body.older_than_days ?? 150)));
  const limit = Math.max(1, Math.min(500, Number(body.limit ?? 200)));
  const { data, error } = await adminClient().rpc('stale_tmdb_media', { p_older_than_days: days, p_limit: limit });
  if (error) throw error;
  let ok = 0;
  let failed = 0;
  for (const row of data as { media_id: string }[]) {
    try {
      await refreshMedia(row.media_id, true);
      ok++;
    } catch (e) {
      failed++;
      console.warn('yenileme hatası', row.media_id, e);
    }
    await new Promise((r) => setTimeout(r, 120)); // TMDB'ye nazik davran
  }
  return json({ refreshed: ok, failed });
}));
