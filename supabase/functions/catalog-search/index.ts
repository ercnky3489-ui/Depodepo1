// POST { q: string, kind?: 'book' | 'movie' | 'series' }
// Önce kendi kataloğumuzda arar; yeterli sonuç yoksa resmi API'lerden getirip kataloğa ekler.
import { adminClient, handler, HttpError, json, userClient } from '../_shared/http.ts';
import { normalizeIsbn, type NormalizedMedia } from '../_shared/normalize.ts';
import { googleBooksByIsbn, openLibrarySearch, tmdbSearch } from '../_shared/sources.ts';
import { storeLookupByIsbn } from '../_shared/stores.ts';

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
  // ISBN zaten katalogdaysa dışarı sormadan döndür
  if (isbn) {
    const bd = await client.from('book_details').select('media_id').eq('isbn13', isbn).limit(1).maybeSingle();
    if (bd.data?.media_id) {
      const m = await client.from('media_items').select('id, kind, title, year, cover_path').eq('id', bd.data.media_id).maybeSingle();
      if (m.data) return json({ results: [{ ...m.data, subtitle: null, rank: 1 }], imported: 0 });
    }
  }
  // ISBN aramasında Türk kitapçıları da sorulur (D&R, BKM, Amazon.com.tr); bilgileri en son yazılır ki
  // Türkçe başlık, kapak ve açıklama uluslararası kaynakların üstüne geçsin.
  let fromStores: { media: NormalizedMedia; stores: string[] } | null = null;
  const tasks: Promise<void>[] = [];
  if (!kind || kind === 'book') {
    if (isbn) {
      tasks.push(googleBooksByIsbn(isbn).then((m) => { if (m) found.push(m); }));
      tasks.push(storeLookupByIsbn(isbn).then((r) => { fromStores = r; }));
    }
    tasks.push(openLibrarySearch(isbn ?? q).then((list) => { found.push(...list); }));
  }
  if (!kind || kind === 'movie') tasks.push(tmdbSearch(q, 'movie').then((l) => { found.push(...l); }));
  if (!kind || kind === 'series') tasks.push(tmdbSearch(q, 'tv').then((l) => { found.push(...l); }));
  const settled = await Promise.allSettled(tasks);
  settled.filter((s) => s.status === 'rejected').forEach((s) => console.warn('kaynak hatası', (s as PromiseRejectedResult).reason));

  const admin = adminClient();
  let imported = 0;
  const toImport = found.slice(0, 30);
  if (fromStores) toImport.push((fromStores as { media: NormalizedMedia }).media);
  for (const item of toImport) {
    const { error } = await admin.rpc('import_media', { p: item });
    if (error) console.warn('import_media', error.message);
    else imported++;
  }

  const again = await client.rpc('search_catalog', { q, p_kind: kind, p_limit: 20 });
  if (again.error) throw again.error;
  // Metin araması ISBN'i tanımaz: ISBN ile eklenen kitabı doğrudan ISBN'den bulup başa koy
  if (isbn) {
    const bd = await client.from('book_details').select('media_id').eq('isbn13', isbn).limit(1).maybeSingle();
    if (bd.data?.media_id && !(again.data ?? []).some((r: { id: string }) => r.id === bd.data!.media_id)) {
      const m = await client.from('media_items').select('id, kind, title, year, cover_path').eq('id', bd.data.media_id).maybeSingle();
      if (m.data) again.data = [{ ...m.data, subtitle: null, rank: 1 }, ...(again.data ?? [])];
    }
  }
  return json({ results: again.data, imported, stores: (fromStores as { stores: string[] } | null)?.stores ?? [] });
}));
