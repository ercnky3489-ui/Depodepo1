// Harici katalog yanıtlarını import_media() fonksiyonunun beklediği biçime çevirir.
// Saf fonksiyonlar: ağ, Deno veya Node API'si kullanmaz; Node ile birim testi yapılır.

export type MediaKind = 'book' | 'movie' | 'series';
export type ContributorRole = 'author' | 'director' | 'writer' | 'actor' | 'creator';

export interface NormalizedContributor {
  name: string;
  role: ContributorRole;
  order: number;
  character?: string | null;
  tmdb_id?: number;
  open_library_key?: string;
  photo_url?: string | null;
}

export interface NormalizedEpisode {
  episode_number: number;
  title?: string | null;
  air_date?: string | null;
  runtime_minutes?: number | null;
}

export interface NormalizedSeason {
  season_number: number;
  title?: string | null;
  episode_count?: number | null;
  air_date?: string | null;
  episodes?: NormalizedEpisode[];
}

export interface NormalizedMedia {
  kind: MediaKind;
  title: string;
  original_title?: string | null;
  year?: number | null;
  description?: string | null;
  cover_url?: string | null;
  backdrop_url?: string | null;
  language?: string | null;
  source: 'open_library' | 'google_books' | 'tmdb';
  external_ids: { source: 'open_library' | 'google_books' | 'tmdb' | 'imdb' | 'isbn'; external_id: string }[];
  contributors?: NormalizedContributor[];
  book?: { isbn13?: string | null; isbn10?: string | null; publisher?: string | null; published_date?: string | null; page_count?: number | null };
  screen?: { runtime_minutes?: number | null; genres: string[]; status?: string | null; original_language?: string | null; season_count?: number | null };
  external_rating?: { source: 'google_books'; value: number; scale: 5 | 10; vote_count: number | null; attribution_url: string } | null;
  seasons?: NormalizedSeason[];
}

// ---------------------------------------------------------------- yardımcılar
const clean = (s: unknown): string | null => {
  if (typeof s !== 'string') return null;
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length ? t : null;
};

const yearOf = (d: unknown): number | null => {
  const m = typeof d === 'string' ? d.match(/^(\d{4})/) : typeof d === 'number' ? [String(d), String(d)] : null;
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1400 && y <= 2100 ? y : null;
};

const isoDate = (d: unknown): string | null => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);

const stripHtml = (s: unknown): string | null => clean(typeof s === 'string' ? s.replace(/<[^>]+>/g, ' ') : null);

export function tmdbImage(path: unknown, size: 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original' = 'w500'): string | null {
  return typeof path === 'string' && path.startsWith('/') ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function openLibraryCover(coverId: unknown, size: 'S' | 'M' | 'L' = 'L'): string | null {
  return typeof coverId === 'number' && coverId > 0 ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : null;
}

// ---------------------------------------------------------------- ISBN
export function normalizeIsbn(raw: string): string | null {
  const s = raw.replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{13}$/.test(s)) return isValidIsbn13(s) ? s : null;
  if (/^\d{9}[\dX]$/.test(s)) return isValidIsbn10(s) ? isbn10to13(s) : null;
  return null;
}

export function isValidIsbn13(s: string): boolean {
  if (!/^\d{13}$/.test(s)) return false;
  const sum = s.split('').reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3), 0);
  return sum % 10 === 0;
}

export function isValidIsbn10(s: string): boolean {
  if (!/^\d{9}[\dX]$/.test(s)) return false;
  const sum = s.split('').reduce((acc, ch, i) => acc + (ch === 'X' ? 10 : Number(ch)) * (10 - i), 0);
  return sum % 11 === 0;
}

export function isbn10to13(isbn10: string): string {
  const core = '978' + isbn10.slice(0, 9);
  const sum = core.split('').reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3), 0);
  return core + String((10 - (sum % 10)) % 10);
}

// ---------------------------------------------------------------- TMDB
// deno-lint-ignore no-explicit-any
type Json = any;

export function fromTmdbMovie(d: Json): NormalizedMedia {
  const crew: Json[] = d?.credits?.crew ?? [];
  const cast: Json[] = d?.credits?.cast ?? [];
  const directors = crew.filter((c) => c.job === 'Director').slice(0, 3);
  const writers = crew.filter((c) => c.department === 'Writing').slice(0, 3);
  const contributors: NormalizedContributor[] = [
    ...directors.map((c, i) => ({ name: c.name, role: 'director' as const, order: i, tmdb_id: c.id, photo_url: tmdbImage(c.profile_path, 'w185') })),
    ...writers.map((c, i) => ({ name: c.name, role: 'writer' as const, order: i, tmdb_id: c.id, photo_url: tmdbImage(c.profile_path, 'w185') })),
    ...cast.slice(0, 15).map((c, i) => ({ name: c.name, role: 'actor' as const, order: i, character: clean(c.character), tmdb_id: c.id, photo_url: tmdbImage(c.profile_path, 'w185') })),
  ];
  const ids: NormalizedMedia['external_ids'] = [{ source: 'tmdb', external_id: `movie:${d.id}` }];
  if (typeof d.imdb_id === 'string' && /^tt\d+$/.test(d.imdb_id)) ids.push({ source: 'imdb', external_id: d.imdb_id });
  return {
    kind: 'movie',
    title: clean(d.title) ?? clean(d.original_title) ?? 'Adsız',
    original_title: clean(d.original_title),
    year: yearOf(d.release_date),
    description: clean(d.overview),
    cover_url: tmdbImage(d.poster_path),
    backdrop_url: tmdbImage(d.backdrop_path, 'w1280'),
    language: clean(d.original_language),
    source: 'tmdb',
    external_ids: ids,
    contributors: dedupeContributors(contributors),
    screen: {
      runtime_minutes: typeof d.runtime === 'number' && d.runtime > 0 ? d.runtime : null,
      genres: (d.genres ?? []).map((g: Json) => clean(g.name)).filter(Boolean),
      status: clean(d.status),
      original_language: clean(d.original_language),
      season_count: null,
    },
  };
}

export function fromTmdbTv(d: Json, seasons: Json[] = []): NormalizedMedia {
  const cast: Json[] = d?.credits?.cast ?? [];
  const contributors: NormalizedContributor[] = [
    ...(d.created_by ?? []).map((c: Json, i: number) => ({ name: c.name, role: 'creator' as const, order: i, tmdb_id: c.id, photo_url: tmdbImage(c.profile_path, 'w185') })),
    ...cast.slice(0, 15).map((c, i) => ({ name: c.name, role: 'actor' as const, order: i, character: clean(c.character), tmdb_id: c.id, photo_url: tmdbImage(c.profile_path, 'w185') })),
  ];
  const ids: NormalizedMedia['external_ids'] = [{ source: 'tmdb', external_id: `tv:${d.id}` }];
  const imdb = d?.external_ids?.imdb_id;
  if (typeof imdb === 'string' && /^tt\d+$/.test(imdb)) ids.push({ source: 'imdb', external_id: imdb });
  const runtimes: number[] = (d.episode_run_time ?? []).filter((n: unknown) => typeof n === 'number' && n > 0);
  const seasonMeta: Json[] = (d.seasons ?? []).filter((s: Json) => s.season_number > 0);
  const detailed = new Map<number, Json>(seasons.map((s) => [s.season_number, s]));
  return {
    kind: 'series',
    title: clean(d.name) ?? clean(d.original_name) ?? 'Adsız',
    original_title: clean(d.original_name),
    year: yearOf(d.first_air_date),
    description: clean(d.overview),
    cover_url: tmdbImage(d.poster_path),
    backdrop_url: tmdbImage(d.backdrop_path, 'w1280'),
    language: clean(d.original_language),
    source: 'tmdb',
    external_ids: ids,
    contributors: dedupeContributors(contributors),
    screen: {
      runtime_minutes: runtimes.length ? runtimes[0] : null,
      genres: (d.genres ?? []).map((g: Json) => clean(g.name)).filter(Boolean),
      status: clean(d.status),
      original_language: clean(d.original_language),
      season_count: typeof d.number_of_seasons === 'number' ? d.number_of_seasons : seasonMeta.length || null,
    },
    seasons: seasonMeta.map((s) => {
      const full = detailed.get(s.season_number);
      return {
        season_number: s.season_number,
        title: clean(s.name),
        episode_count: typeof s.episode_count === 'number' ? s.episode_count : null,
        air_date: isoDate(s.air_date),
        episodes: (full?.episodes ?? []).map((e: Json) => ({
          episode_number: e.episode_number,
          title: clean(e.name),
          air_date: isoDate(e.air_date),
          runtime_minutes: typeof e.runtime === 'number' && e.runtime > 0 ? e.runtime : null,
        })),
      };
    }),
  };
}

// Arama sonucu için hafif kayıt (detay sayfası açılınca catalog-import tamamlar)
export function fromTmdbSearchItem(item: Json, mediaType: 'movie' | 'tv'): NormalizedMedia | null {
  if (!item || typeof item.id !== 'number') return null;
  const title = mediaType === 'movie' ? clean(item.title) : clean(item.name);
  if (!title) return null;
  return {
    kind: mediaType === 'movie' ? 'movie' : 'series',
    title,
    original_title: clean(mediaType === 'movie' ? item.original_title : item.original_name),
    year: yearOf(mediaType === 'movie' ? item.release_date : item.first_air_date),
    description: clean(item.overview),
    cover_url: tmdbImage(item.poster_path),
    backdrop_url: tmdbImage(item.backdrop_path, 'w1280'),
    language: clean(item.original_language),
    source: 'tmdb',
    external_ids: [{ source: 'tmdb', external_id: `${mediaType}:${item.id}` }],
  };
}

// ---------------------------------------------------------------- Open Library
export function fromOpenLibrarySearchDoc(doc: Json): NormalizedMedia | null {
  const title = clean(doc?.title);
  const key = clean(doc?.key);
  if (!title || !key) return null;
  const isbns: string[] = (doc.isbn ?? []).map((s: string) => normalizeIsbn(String(s))).filter(Boolean);
  const isbn13 = isbns[0] ?? null;
  const authors: string[] = doc.author_name ?? [];
  const authorKeys: string[] = doc.author_key ?? [];
  const ids: NormalizedMedia['external_ids'] = [{ source: 'open_library', external_id: key }];
  if (isbn13) ids.push({ source: 'isbn', external_id: isbn13 });
  return {
    kind: 'book',
    title,
    year: yearOf(doc.first_publish_year),
    cover_url: openLibraryCover(doc.cover_i),
    language: Array.isArray(doc.language) && doc.language.includes('tur') ? 'tur' : clean(doc.language?.[0]),
    source: 'open_library',
    external_ids: ids,
    contributors: authors.slice(0, 5).map((name, i) => ({
      name,
      role: 'author' as const,
      order: i,
      ...(authorKeys[i] ? { open_library_key: `/authors/${authorKeys[i]}` } : {}),
    })),
    book: {
      isbn13,
      page_count: typeof doc.number_of_pages_median === 'number' && doc.number_of_pages_median > 0 ? doc.number_of_pages_median : null,
      publisher: clean(doc.publisher?.[0]),
    },
  };
}

// ---------------------------------------------------------------- Google Books
export function fromGoogleVolume(v: Json): NormalizedMedia | null {
  const info = v?.volumeInfo;
  const title = clean(info?.title);
  if (!info || !title || typeof v.id !== 'string') return null;
  const idents: Json[] = info.industryIdentifiers ?? [];
  const isbn13raw = idents.find((x) => x.type === 'ISBN_13')?.identifier;
  const isbn10raw = idents.find((x) => x.type === 'ISBN_10')?.identifier;
  const isbn13 = (isbn13raw && normalizeIsbn(isbn13raw)) || (isbn10raw && normalizeIsbn(isbn10raw)) || null;
  const ids: NormalizedMedia['external_ids'] = [{ source: 'google_books', external_id: v.id }];
  if (isbn13) ids.push({ source: 'isbn', external_id: isbn13 });
  const thumb: string | undefined = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
  const link = clean(info.infoLink) ?? clean(info.canonicalVolumeLink) ?? `https://books.google.com/books?id=${v.id}`;
  const rating =
    typeof info.averageRating === 'number' && info.averageRating > 0
      ? { source: 'google_books' as const, value: info.averageRating, scale: 5 as const, vote_count: typeof info.ratingsCount === 'number' ? info.ratingsCount : null, attribution_url: link }
      : null;
  return {
    kind: 'book',
    title: clean(info.subtitle) ? `${title}: ${clean(info.subtitle)}` : title,
    year: yearOf(info.publishedDate),
    description: stripHtml(info.description),
    cover_url: thumb ? thumb.replace(/^http:/, 'https:') : null,
    language: clean(info.language),
    source: 'google_books',
    external_ids: ids,
    contributors: (info.authors ?? []).slice(0, 5).map((name: string, i: number) => ({ name, role: 'author' as const, order: i })),
    book: {
      isbn13,
      isbn10: isbn10raw && /^\d{9}[\dX]$/.test(isbn10raw) ? isbn10raw : null,
      publisher: clean(info.publisher),
      published_date: clean(info.publishedDate),
      page_count: typeof info.pageCount === 'number' && info.pageCount > 0 ? info.pageCount : null,
    },
    external_rating: rating,
  };
}

function dedupeContributors(list: NormalizedContributor[]): NormalizedContributor[] {
  const seen = new Set<string>();
  return list.filter((c) => {
    if (!clean(c.name)) return false;
    const k = `${c.role}:${c.tmdb_id ?? c.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Google Books arama sonucu için hafif özet: kataloğa YAZILMAZ, yalnızca seçim ekranında gösterilir.
// Sıra Google'ın döndürdüğü gibi korunur (Google Books şartları sonuçların yeniden sıralanmasına izin vermez).
export interface GoogleBookSummary {
  google_id: string;
  title: string;
  authors: string[];
  publisher: string | null;
  year: number | null;
  isbn13: string | null;
  cover_url: string | null;
  info_link: string;
}

export function googleSummary(v: Json): GoogleBookSummary | null {
  const m = fromGoogleVolume(v);
  if (!m) return null;
  return {
    google_id: v.id,
    title: m.title,
    authors: (m.contributors ?? []).map((c) => c.name),
    publisher: m.book?.publisher ?? null,
    year: m.year ?? null,
    isbn13: m.book?.isbn13 ?? null,
    cover_url: m.cover_url ?? null,
    info_link: clean(v?.volumeInfo?.infoLink) ?? `https://books.google.com/books?id=${v.id}`,
  };
}
