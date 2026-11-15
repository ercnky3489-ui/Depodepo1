// POST { q: string, kind?: 'book' | 'movie' | 'series' }
// Önce kendi kataloğumuzda arar; yeterli sonuç yoksa resmi API'lerden getirip kataloğa ekler.
import { adminClient, handler, HttpError, json, userClient } from '../_shared/http.ts';
import { normalizeIsbn, type NormalizedMedia } from '../_shared/normalize.ts';
import { googleBooksByIsbn, openLibrarySearch, tmdbSearch } from '../_shared/sources.ts';

const MIN_LOCAL = 8;

Deno.serve(handler(async (req) => {
  const { client } = await userClient(req);
  const body = await req.json().catch(() => ({}));
  const q = String(body.q ?? '').trim().slice(0, 120);
  const kind = ['book', 'movie', 'series'].includes(body.kind) ? body.kind : null;
  if (q.length < 2) throw new HttpError(400, 'query_too_short');

  const local = await client.rpc('search_catalog', { q, p_kind: kind, p_limit: 20 });
  if (local.error) throw local.error;
  if ((local.data?.length ?? 0) >= MIN_LOCAL || q.length < 3) {
    return json({ results: local.data, imported: 0 });
  }

  const found: NormalizedMedia[] = [];
  const isbn = normalizeIsbn(q);
  const tasks: Promise<void>[] = [];
  if (!kind || kind === 'book') {
    if (isbn) {
      tasks.push(googleBooksByIsbn(isbn).then((m) => { if (m) found.push(m); }));
    }
    tasks.push(openLibrarySearch(isbn ?? q).then((list) => { found.push(...list); }));
  }
  if (!kind || kind === 'movie') tasks.push(tmdbSearch(q, 'movie').then((l) => { found.push(...l); }));
  if (!kind || kind === 'series') tasks.push(tmdbSearch(q, 'tv').then((l) => { found.push(...l); }));
  const settled = await Promise.allSettled(tasks);
  settled.filter((s) => s.status === 'rejected').forEach((s) => console.warn('kaynak hatası', (s as PromiseRejectedResult).reason));

  const admin = adminClient();
  let imported = 0;
  for (const item of found.slice(0, 30)) {
    const { error } = await admin.rpc('import_media', { p: item });
    if (error) console.warn('import_media', error.message);
    else imported++;
  }

  const again = await client.rpc('search_catalog', { q, p_kind: kind, p_limit: 20 });
  if (again.error) throw again.error;
  return json({ results: again.data, imported });
}));
