// Çalıştırma: npx tsx --test supabase/functions/_shared/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fromGoogleVolume, fromOpenLibrarySearchDoc, fromTmdbMovie, fromTmdbSearchItem, fromTmdbTv,
  isbn10to13, isValidIsbn10, isValidIsbn13, normalizeIsbn, tmdbImage,
} from './normalize.ts';
import { buildPush, deepLink } from './pushText.ts';

test('ISBN doğrulama ve dönüştürme', () => {
  assert.equal(isValidIsbn13('9780306406157'), true);
  assert.equal(isValidIsbn13('9780306406158'), false);
  assert.equal(isValidIsbn10('0306406152'), true);
  assert.equal(isValidIsbn10('080442957X'), true);
  assert.equal(isbn10to13('0306406152'), '9780306406157');
  assert.equal(normalizeIsbn('978-0-306-40615-7'), '9780306406157');
  assert.equal(normalizeIsbn('0-306-40615-2'), '9780306406157');
  assert.equal(normalizeIsbn('kırık saatler'), null);
  assert.equal(normalizeIsbn('9780306406158'), null);
});

test('TMDB görsel adresi', () => {
  assert.equal(tmdbImage('/abc.jpg'), 'https://image.tmdb.org/t/p/w500/abc.jpg');
  assert.equal(tmdbImage(null), null);
  assert.equal(tmdbImage('http://evil/x.jpg'), null);
});

test('TMDB film detayı', () => {
  const m = fromTmdbMovie({
    id: 42, imdb_id: 'tt0042', title: 'Gece Treni', original_title: 'Night Train', release_date: '2025-03-01',
    overview: '  Altı   yolcu. ', poster_path: '/p.jpg', backdrop_path: '/b.jpg', runtime: 112, status: 'Released',
    original_language: 'tr', genres: [{ name: 'Gerilim' }, { name: 'Dram' }],
    credits: {
      crew: [{ id: 1, name: 'Defne Kaya', job: 'Director', department: 'Directing' }, { id: 1, name: 'Defne Kaya', job: 'Screenplay', department: 'Writing' }],
      cast: [{ id: 2, name: 'Ada Sevim', character: 'Mira' }, { id: 3, name: 'Kaan Erel', character: 'Kondüktör' }],
    },
  });
  assert.equal(m.kind, 'movie');
  assert.equal(m.year, 2025);
  assert.equal(m.description, 'Altı yolcu.');
  assert.deepEqual(m.external_ids, [{ source: 'tmdb', external_id: 'movie:42' }, { source: 'imdb', external_id: 'tt0042' }]);
  assert.deepEqual(m.screen?.genres, ['Gerilim', 'Dram']);
  assert.equal(m.contributors?.filter((c) => c.role === 'director').length, 1);
  assert.equal(m.contributors?.find((c) => c.role === 'actor' && c.order === 0)?.character, 'Mira');
});

test('TMDB dizi, sezon 0 (özel bölümler) atlanır', () => {
  const s = fromTmdbTv(
    {
      id: 7, name: 'Sessiz Liman', first_air_date: '2024-09-10', number_of_seasons: 2, episode_run_time: [48],
      created_by: [{ id: 9, name: 'Ozan Tekin' }], genres: [{ name: 'Dram' }],
      seasons: [{ season_number: 0, name: 'Özel' }, { season_number: 1, name: '1. Sezon', episode_count: 2, air_date: '2024-09-10' }, { season_number: 2, episode_count: 1 }],
      external_ids: { imdb_id: 'tt777' },
    },
    [{ season_number: 1, episodes: [{ episode_number: 1, name: 'Gelgit', air_date: '2024-09-10', runtime: 50 }, { episode_number: 2, name: 'Yabancı' }] }],
  );
  assert.equal(s.kind, 'series');
  assert.equal(s.seasons?.length, 2);
  assert.equal(s.seasons?.[0].episodes?.length, 2);
  assert.equal(s.seasons?.[1].episodes?.length, 0);
  assert.equal(s.screen?.runtime_minutes, 48);
  assert.ok(s.external_ids.some((x) => x.source === 'imdb' && x.external_id === 'tt777'));
});

test('TMDB arama sonucu, adı olmayan atlanır', () => {
  assert.equal(fromTmdbSearchItem({ id: 1 }, 'movie'), null);
  assert.equal(fromTmdbSearchItem({ id: 2, name: 'Rıhtım 9', first_air_date: '2026-01-01' }, 'tv')?.external_ids[0].external_id, 'tv:2');
});

test('Open Library arama kaydı', () => {
  const b = fromOpenLibrarySearchDoc({
    key: '/works/OL1W', title: 'Kuzey Defteri', author_name: ['Nil Ersoy'], author_key: ['OL9A'],
    first_publish_year: 2024, cover_i: 123, isbn: ['bad', '0306406152'], number_of_pages_median: 412, language: ['eng', 'tur'],
  });
  assert.equal(b?.book?.isbn13, '9780306406157');
  assert.equal(b?.cover_url, 'https://covers.openlibrary.org/b/id/123-L.jpg');
  assert.equal(b?.language, 'tur');
  assert.equal(b?.contributors?.[0].open_library_key, '/authors/OL9A');
  assert.equal(fromOpenLibrarySearchDoc({ title: 'Anahtarsız' }), null);
});

test('Google Books: harici puan 5 üzerinden ve kaynak bağlantısıyla', () => {
  const v = fromGoogleVolume({
    id: 'gb1',
    volumeInfo: {
      title: 'Son Kütüphaneci', subtitle: 'Bir roman', authors: ['Aras Demir'], publishedDate: '2025-02',
      description: '<p>Bir <b>şehir</b> ve kitapları.</p>', pageCount: 388, averageRating: 4.5, ratingsCount: 12,
      industryIdentifiers: [{ type: 'ISBN_13', identifier: '9780306406157' }],
      imageLinks: { thumbnail: 'http://books.google.com/x.jpg' }, infoLink: 'https://books.google.com/books?id=gb1',
    },
  });
  assert.equal(v?.title, 'Son Kütüphaneci: Bir roman');
  assert.equal(v?.description, 'Bir şehir ve kitapları.');
  assert.equal(v?.cover_url, 'https://books.google.com/x.jpg');
  assert.deepEqual(v?.external_rating, { source: 'google_books', value: 4.5, scale: 5, vote_count: 12, attribution_url: 'https://books.google.com/books?id=gb1' });
  assert.equal(fromGoogleVolume({ id: 'gb2', volumeInfo: { title: 'Puansız' } })?.external_rating, null);
});

test('Push metinleri Türkçe ve doğru ekle', () => {
  const base = { id: 'n1', target_id: 't1', data: {}, actor_name: 'Can Öz' };
  assert.equal(buildPush({ ...base, type: 'like', target_type: 'quote' })?.body, 'Can Öz alıntını beğendi.');
  assert.equal(buildPush({ ...base, type: 'comment', target_type: 'review' })?.body, 'Can Öz incelemene yorum yaptı.');
  assert.equal(buildPush({ ...base, type: 'comment', target_type: 'quote' })?.body, 'Can Öz alıntına yorum yaptı.');
  assert.equal(buildPush({ ...base, type: 'badge', target_type: 'badge', data: { code: 'film_buff', tier: 3 } })?.body, 'Film Tutkunu · Altın kazandın.');
  assert.equal(buildPush({ ...base, type: 'level_up', target_type: 'profile', data: { level: 7 } })?.body, 'Tebrikler, Seviye 7 oldun.');
  assert.equal(deepLink({ type: 'follow', target_type: 'profile', target_id: 'u1' }), 'bookflix://user/u1');
  assert.equal(deepLink({ type: 'like', target_type: 'quote', target_id: 'q1' }), 'bookflix://quote/q1');
});

test('Google Books özeti: sıra ve alanlar korunur, sahte değer üretilmez', async () => {
  const { googleSummary } = await import('./normalize.ts');
  const s = googleSummary({ id: 'abc123', volumeInfo: { title: 'Kürk Mantolu Madonna', authors: ['Sabahattin Ali'], publisher: 'Yapı Kredi Yayınları',
    publishedDate: '2019-05', industryIdentifiers: [{ type: 'ISBN_10', identifier: '0306406152' }],
    imageLinks: { thumbnail: 'http://books.google.com/x?id=abc123&zoom=1' }, infoLink: 'https://books.google.com/books?id=abc123' } });
  assert.equal(s?.google_id, 'abc123');
  assert.equal(s?.isbn13, '9780306406157');
  assert.equal(s?.publisher, 'Yapı Kredi Yayınları');
  assert.equal(s?.year, 2019);
  assert.ok(s?.cover_url?.startsWith('https://'));
  const bare = googleSummary({ id: 'x1', volumeInfo: { title: 'Adsız' } });
  assert.equal(bare?.publisher, null);
  assert.equal(bare?.isbn13, null);
  assert.deepEqual(bare?.authors, []);
  assert.equal(googleSummary({ id: 'x2', volumeInfo: {} }), null);
});
