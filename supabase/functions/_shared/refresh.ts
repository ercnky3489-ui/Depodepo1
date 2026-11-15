// Bir katalog kaydını kaynağından tam detayla yeniler (catalog-import ve catalog-refresh kullanır).
import { adminClient, HttpError } from './http.ts';
import { googleBooksByIsbn, tmdbMovieDetail, tmdbTvDetail } from './sources.ts';
import type { NormalizedMedia } from './normalize.ts';

export async function refreshMedia(mediaId: string, force = false): Promise<string> {
  const admin = adminClient();
  const { data: media, error } = await admin
    .from('media_items')
    .select('id, kind, refreshed_at, external_ids(source, external_id), book_details(isbn13)')
    .eq('id', mediaId)
    .single();
  if (error || !media) throw new HttpError(404, 'media_not_found');
  const fresh = Date.now() - new Date(media.refreshed_at).getTime() < 24 * 3600 * 1000;
  if (fresh && !force) return media.id;

  const ids = media.external_ids as { source: string; external_id: string }[];
  const tmdb = ids.find((x) => x.source === 'tmdb')?.external_id;
  let payload: NormalizedMedia | null = null;
  if (tmdb?.startsWith('movie:')) payload = await tmdbMovieDetail(tmdb.slice(6));
  else if (tmdb?.startsWith('tv:')) payload = await tmdbTvDetail(tmdb.slice(3));
  else if (media.kind === 'book') {
    // deno-lint-ignore no-explicit-any
    const isbn = (media.book_details as any)?.isbn13 ?? ids.find((x) => x.source === 'isbn')?.external_id;
    if (isbn) payload = await googleBooksByIsbn(isbn);
  }
  if (!payload) return media.id;
  // Eşleşmenin bu kayda gitmesi için mevcut kimlikler de gönderilir.
  payload.external_ids = [...payload.external_ids, ...ids.filter((x) => !payload!.external_ids.some((y) => y.source === x.source))] as NormalizedMedia['external_ids'];
  const res = await admin.rpc('import_media', { p: payload });
  if (res.error) throw res.error;
  return res.data as string;
}
