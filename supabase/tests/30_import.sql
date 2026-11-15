-- Katalog içe aktarma: tekrarsızlık, birleştirme, sezon/bölüm, harici puan ayrımı
\set ON_ERROR_STOP 1

set role authenticated;
select t.throws($$select public.import_media('{"kind":"book","title":"x","source":"user"}')$$, 'istemci import_media çağıramaz');
reset role;

select public.import_media($j${
  "kind":"book","title":"Kuzey Defteri","year":2024,"source":"open_library","language":"tur",
  "cover_url":"https://covers.openlibrary.org/b/id/123-L.jpg",
  "external_ids":[{"source":"open_library","external_id":"/works/OL1W"},{"source":"isbn","external_id":"9789750000001"}],
  "book":{"isbn13":"9789750000001","page_count":412},
  "contributors":[{"name":"Nil Ersoy","role":"author","open_library_key":"/authors/OL9A","order":0}]
}$j$) as first_id \gset

select public.import_media($j${
  "kind":"book","title":"Kuzey Defteri","source":"google_books","description":"Soğuk bir kasabada geçen roman.",
  "external_ids":[{"source":"google_books","external_id":"gb123"}],
  "book":{"isbn13":"9789750000001","publisher":"Örnek Yayınları"},
  "external_rating":{"source":"google_books","value":4.2,"scale":5,"vote_count":37,"attribution_url":"https://books.google.com/books?id=gb123"}
}$j$) as second_id \gset

select t.ok(:'first_id' = :'second_id', 'aynı ISBN farklı kaynaktan gelince tek kayıtta birleşir');
select t.ok((select count(*) from public.external_ids where media_id = :'first_id') = 3, 'üç kaynak kimliği de saklandı');
select t.ok((select publisher = 'Örnek Yayınları' and page_count = 412 from public.book_details where media_id = :'first_id'),
  'kitap bilgileri iki kaynaktan tamamlandı');
select t.ok((select description is not null from public.media_items where id = :'first_id'), 'açıklama eklendi');
select t.ok((select value = 4.2 and scale = 5 from public.external_ratings where media_id = :'first_id' and source = 'google_books'),
  'harici puan ayrı tabloda, ölçeği ve kaynak bağlantısıyla');
select t.ok((select user_rating_count from public.media_stats where media_id = :'first_id') = 0, 'harici puan kullanıcı puanına karışmadı');

select public.import_media($j${
  "kind":"series","title":"Sessiz Liman","year":2024,"source":"tmdb",
  "external_ids":[{"source":"tmdb","external_id":"tv:555"}],
  "screen":{"genres":["Dram","Gizem"],"season_count":2},
  "contributors":[{"name":"Ozan Tekin","role":"creator","tmdb_id":901,"order":0},{"name":"Ada Sevim","role":"actor","tmdb_id":902,"character":"Mira","order":1}],
  "seasons":[{"season_number":1,"episode_count":2,"episodes":[{"episode_number":1,"title":"Gelgit"},{"episode_number":2,"title":"Yabancı"}]}]
}$j$) as series_id \gset
select public.import_media($j${
  "kind":"series","title":"Sessiz Liman","source":"tmdb",
  "external_ids":[{"source":"tmdb","external_id":"tv:555"}],
  "seasons":[{"season_number":1,"episodes":[{"episode_number":2,"title":"Yabancı (güncel)"},{"episode_number":3,"title":"Tuz"}]},
             {"season_number":2,"episodes":[{"episode_number":1,"title":"Dönüş"}]}]
}$j$) as series_id2 \gset
select t.ok(:'series_id' = :'series_id2', 'dizi TMDB kimliğiyle eşleşti');
select t.ok((select count(*) from public.episodes e join public.seasons s on s.id = e.season_id where s.media_id = :'series_id') = 4,
  'sezon ve bölümler güncellendi, tekrar oluşmadı');
select t.ok((select e.title from public.episodes e join public.seasons s on s.id = e.season_id
             where s.media_id = :'series_id' and s.season_number = 1 and e.episode_number = 2) = 'Yabancı (güncel)', 'bölüm adı güncellendi');
select t.ok((select genres from public.screen_details where media_id = :'series_id') = array['Dram', 'Gizem'], 'türler korundu');
select t.ok((select count(*) from public.media_contributors where media_id = :'series_id') = 2, 'yaratıcı ve oyuncu bağlandı');

-- Kullanıcı kitabı ekler: moderasyona düşer, ekleyen görür, başkası görmez
select t.as_user('11111111-0000-0000-0000-000000000001');
set role authenticated;
select public.add_user_book('Yerel Bir Roman', 'Deniz Yazar', '978-0306406157', 220, 2021) as ub \gset
select t.ok((select moderation_status = 'pending' from public.media_items where id = :'ub'), 'kullanıcı kitabı moderasyona düşer');
select t.ok((select count(*) from public.search_catalog('yerel bir roman')) = 1, 'ekleyen kendi kitabını görür');
select t.ok(public.add_user_book('Aynı ISBN', 'Başka', '9780306406157') = :'ub', 'aynı ISBN ikinci kez eklenmez');
select t.throws($$select public.add_user_book('', 'x')$$, 'boş kitap adı reddedilir');
reset role;
select t.as_user('22222222-0000-0000-0000-000000000002');
set role authenticated;
select t.ok((select count(*) from public.search_catalog('yerel bir roman')) = 0, 'onaylanmamış kitabı başkası görmez');
reset role;
