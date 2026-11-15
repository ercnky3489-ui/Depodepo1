// Harici kaynak istemcileri. Her biri resmi API'yi kendi şartlarına uygun çağırır:
// - TMDB: ticari API anahtarı (TMDB_READ_TOKEN), tr-TR dil, yetişkin içerik kapalı.
// - Open Library: kimlikli User-Agent (saniyede 3 istek sınırı), toplu veri için aylık dökümler kullanılır.
// - Google Books: API anahtarı, sonuçlar yeniden sıralanmadan tek tek ISBN ile zenginleştirmede kullanılır.
// Hiçbir kaynaktan sayfa kazıma (scraping) yapılmaz.
import { env, fetchJson } from './http.ts';
import {
  fromGoogleVolume, fromOpenLibrarySearchDoc, googleSummary, type GoogleBookSummary, fromTmdbMovie, fromTmdbSearchItem, fromTmdbTv,
  type NormalizedMedia,
} from './normalize.ts';

const TMDB = 'https://api.themoviedb.org/3';

function tmdbHeaders(): HeadersInit {
  return { Authorization: `Bearer ${env('TMDB_READ_TOKEN')}`, Accept: 'application/json' };
}

export async function tmdbSearch(q: string, type: 'movie' | 'tv'): Promise<NormalizedMedia[]> {
  const url = `${TMDB}/search/${type}?query=${encodeURIComponent(q)}&language=tr-TR&include_adult=false&page=1`;
  // deno-lint-ignore no-explicit-any
  const data = await fetchJson<{ results: any[] }>(url, { headers: tmdbHeaders() });
  return (data.results ?? []).slice(0, 10).map((r) => fromTmdbSearchItem(r, type)).filter((x): x is NormalizedMedia => x !== null);
}

export async function tmdbMovieDetail(id: string): Promise<NormalizedMedia> {
  const d = await fetchJson(`${TMDB}/movie/${id}?language=tr-TR&append_to_response=credits`, { headers: tmdbHeaders() });
  return fromTmdbMovie(d);
}

export async function tmdbTvDetail(id: string): Promise<NormalizedMedia> {
  // deno-lint-ignore no-explicit-any
  const d = await fetchJson<any>(`${TMDB}/tv/${id}?language=tr-TR&append_to_response=credits,external_ids`, { headers: tmdbHeaders() });
  // deno-lint-ignore no-explicit-any
  const numbers: number[] = (d.seasons ?? []).map((s: any) => s.season_number).filter((n: number) => n > 0).slice(0, 30);
  const seasons = [];
  for (const n of numbers) {
    seasons.push(await fetchJson(`${TMDB}/tv/${id}/season/${n}?language=tr-TR`, { headers: tmdbHeaders() }));
  }
  return fromTmdbTv(d, seasons);
}

function openLibraryHeaders(): HeadersInit {
  return { 'User-Agent': `BOOKFLIX/1.0 (${env('OPEN_LIBRARY_CONTACT')})`, Accept: 'application/json' };
}

export async function openLibrarySearch(q: string): Promise<NormalizedMedia[]> {
  const fields = 'key,title,author_name,author_key,first_publish_year,cover_i,isbn,number_of_pages_median,language,publisher';
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=10&fields=${fields}`;
  // deno-lint-ignore no-explicit-any
  const data = await fetchJson<{ docs: any[] }>(url, { headers: openLibraryHeaders() });
  return (data.docs ?? []).map(fromOpenLibrarySearchDoc).filter((x): x is NormalizedMedia => x !== null);
}

export async function googleBooksByIsbn(isbn13: string): Promise<NormalizedMedia | null> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}&maxResults=1&key=${env('GOOGLE_BOOKS_API_KEY')}`;
  // deno-lint-ignore no-explicit-any
  const data = await fetchJson<{ items?: any[] }>(url);
  return data.items?.[0] ? fromGoogleVolume(data.items[0]) : null;
}

const GOOGLE = 'https://www.googleapis.com/books/v1/volumes';

/** Serbest metinle kitap arar. Türkçe kitaplar öncelikli: langRestrict=tr. Sonuç sırası değiştirilmez. */
export async function googleBooksSearch(q: string, startIndex = 0, lang: 'tr' | 'any' = 'tr'): Promise<{ items: GoogleBookSummary[]; total: number }> {
  const params = new URLSearchParams({
    q, printType: 'books', maxResults: '20', startIndex: String(Math.max(0, Math.min(startIndex, 200))),
    key: env('GOOGLE_BOOKS_API_KEY'),
  });
  if (lang === 'tr') params.set('langRestrict', 'tr');
  // deno-lint-ignore no-explicit-any
  const data = await fetchJson<{ items?: any[]; totalItems?: number }>(`${GOOGLE}?${params}`);
  const items = (data.items ?? []).map(googleSummary).filter((x): x is GoogleBookSummary => x !== null);
  return { items, total: data.totalItems ?? items.length };
}

/** Kullanıcı bir Google Books sonucunu seçtiğinde tam kaydı getirir (kataloğa yalnızca o zaman yazılır). */
export async function googleBooksById(id: string): Promise<NormalizedMedia | null> {
  if (!/^[A-Za-z0-9_-]{4,40}$/.test(id)) return null;
  const d = await fetchJson(`${GOOGLE}/${id}?key=${env('GOOGLE_BOOKS_API_KEY')}`);
  return fromGoogleVolume(d);
}
