// POST { q: string, start?: number, lang?: 'tr' | 'any' }  → Google Books arama sonuçları (kataloğa yazmaz)
// POST { google_id: string }                              → seçilen kitabı kataloğa aktarır, { media_id } döner
// Google Books şartları: sonuçlar sırası değiştirilmeden ve "Google Books" adıyla gösterilir;
// kapak görselleri indirilmez, adresleri kullanılır.
import { adminClient, handler, HttpError, json, userClient } from '../_shared/http.ts';
import { googleBooksById, googleBooksSearch } from '../_shared/sources.ts';

Deno.serve(handler(async (req) => {
  const { client } = await userClient(req);
  const body = await req.json().catch(() => ({}));

  if (typeof body.google_id === 'string') {
    const m = await googleBooksById(body.google_id);
    if (!m) throw new HttpError(404, 'not_found');
    const { data, error } = await adminClient().rpc('import_media', { p: m });
    if (error) throw error;
    // Kullanıcının görebildiğini doğrula (moderasyon vb.)
    const check = await client.from('media_items').select('id').eq('id', data).maybeSingle();
    if (!check.data) throw new HttpError(404, 'not_visible');
    return json({ media_id: data });
  }

  const q = String(body.q ?? '').trim().slice(0, 120);
  if (q.length < 2) throw new HttpError(400, 'query_too_short');
  const start = Number.isFinite(body.start) ? Number(body.start) : 0;
  const lang = body.lang === 'any' ? 'any' : 'tr';
  const res = await googleBooksSearch(q, start, lang);
  return json({ ...res, attribution: 'Google Books' });
}));
