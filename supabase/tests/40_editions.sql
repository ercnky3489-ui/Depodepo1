-- Eser / baskı / yayınevi / kapak katkısı
\set ON_ERROR_STOP 1
\set U1 '''11111111-0000-0000-0000-000000000001'''
\set U2 '''22222222-0000-0000-0000-000000000002'''
\set M '''eeeeeeee-0000-0000-0000-000000000005'''

select t.ok(public.isbn_valid('978-0306406157'), 'geçerli ISBN-13');
select t.ok(not public.isbn_valid('9780306406158'), 'kontrol hanesi yanlış ISBN-13 reddedilir');
select t.ok(public.isbn_valid('0-306-40615-2'), 'geçerli ISBN-10');
select t.ok(public.isbn_to_13('0306406152') = '9780306406157', 'ISBN-10 → ISBN-13 dönüşümü');
select t.ok(public.publisher_key(' YAPI  KREDİ Yayınları ') = public.publisher_key('Yapı Kredi Yayınları'), 'yayınevi adı büyük/küçük harf ve boşluktan bağımsız');

-- Harici kaynaktan gelen kitap baskı olarak kaydedilir; aynı eserin ikinci baskısı ayrı satır olur
select public.import_media($j${
  "kind":"book","title":"Deniz Feneri","year":1950,"source":"google_books",
  "cover_url":"https://books.google.com/x.jpg",
  "external_ids":[{"source":"google_books","external_id":"gbDF1"}],
  "book":{"isbn13":"9786050000016","publisher":"Yapı Kredi Yayınları","published_date":"2019-03-01","page_count":210}
}$j$) as work \gset
select t.ok((select count(*) from public.book_editions where media_id = :'work') = 1, 'import ile baskı oluştu');
select t.ok((select p.name = 'Yapı Kredi Yayınları' and e.edition_year = 2019 and e.page_count = 210 and e.source = 'google_books'
             from public.book_editions e join public.publishers p on p.id = e.publisher_id where e.isbn13 = '9786050000016'),
  'baskı yayınevi, yıl ve sayfa bilgisiyle');
select public.import_media($j${
  "kind":"book","title":"Deniz Feneri","source":"google_books",
  "external_ids":[{"source":"google_books","external_id":"gbDF1"}],
  "book":{"isbn13":"9786050000016","publisher":"YAPI KREDİ YAYINLARI"}
}$j$) \gset
select t.ok((select count(*) from public.publishers where name_key = public.publisher_key('Yapı Kredi Yayınları')) = 1, 'yayınevi tekrar oluşmaz');
select t.ok((select count(*) from public.book_editions where media_id = :'work') = 1, 'aynı ISBN ile baskı tekrar oluşmaz');

-- Kullanıcı ikinci bir baskı ekler (moderasyona düşer)
select t.as_user(:U1);
set role authenticated;
select public.add_book_edition(:'work', 'Can Yayınları', 'Ayşe Çevirmen', 2021, 240, '0-8044-2957-X') as ed2 \gset
select t.ok((select moderation_status = 'pending' and isbn13 = '9780804429573' from public.book_editions where id = :'ed2'),
  'kullanıcı baskısı bekler, ISBN-10 13e çevrilir');
select t.ok((select count(*) from public.media_editions(:'work')) = 2, 'ekleyen kendi bekleyen baskısını görür');
select t.ok(public.add_book_edition(:'work', 'Başka', null, null, null, '9780804429573') = :'ed2', 'aynı ISBN ikinci kez eklenmez');
select t.throws($$select public.add_book_edition((select media_id from public.book_editions limit 1), 'X Yayınları', null, null, null, '9780306406158')$$,
  'geçersiz ISBN reddedilir');
select t.throws($$insert into public.book_editions (media_id, source) values ((select id from public.media_items limit 1), 'user')$$,
  'istemci baskı tablosuna doğrudan yazamaz');

-- Okuduğu baskıyı seçer
insert into public.library_entries (user_id, media_id, status, edition_id) values (:U1, :'work', 'completed', :'ed2');
select t.ok((select is_mine from public.media_editions(:'work') where id = :'ed2'), 'okuduğum baskı işaretli');
reset role;

-- Başka kullanıcı bekleyen baskıyı görmez, seçemez
select t.as_user(:U2);
set role authenticated;
select t.ok((select count(*) from public.media_editions(:'work')) = 1, 'bekleyen baskı başkasına görünmez');
select t.throws(format($$insert into public.library_entries (user_id, media_id, status, edition_id) values (%L, %L, 'planned', %L)$$,
  :U2, :'work', :'ed2'), 'görünmeyen baskı seçilemez');
-- Kapak önerisi: kendi klasörü dışına yol verilemez
select t.throws(format($$select public.submit_cover(%L, 'user-covers/%s/a.jpg')$$,
  (select id from public.book_editions where isbn13 = '9786050000016'), :U1), 'başkasının klasöründeki dosya önerilemez');
select public.submit_cover((select id from public.book_editions where isbn13 = '9786050000016'),
  'user-covers/' || :U2 || '/kapak1.jpg') as sub \gset
select t.ok((select status = 'pending' from public.cover_submissions where id = :'sub'), 'kapak önerisi moderasyonda');
select t.throws(format($$select public.moderate_cover(%L, true)$$, :'sub'), 'normal kullanıcı kapak onaylayamaz');
reset role;

-- Moderatör onaylar
select t.as_user(:M);
set role authenticated;
select public.moderate_cover(:'sub', true);
select public.moderate_edition(:'ed2', true);
reset role;
select t.ok((select cover_path = 'storage:user-covers/' || :U2 || '/kapak1.jpg' from public.book_editions where isbn13 = '9786050000016'),
  'onaylanan kapak baskıya yazıldı');
select t.ok((select cover_path like 'storage:%' from public.media_items where id = :'work'), 'eser kapağı harici bağlantı yerine onaylı kapak oldu');

select t.as_user(:U2);
set role authenticated;
select t.ok((select count(*) from public.media_editions(:'work')) = 2, 'onaylanan baskı herkese görünür');
select t.ok((select book_count = 1 from public.search_publishers('can yay')), 'yayınevi araması');
select t.ok((select count(*) from public.publisher_books((select id from public.publishers where name = 'Can Yayınları'))) = 1, 'yayınevi sayfası kitabı listeler');
select t.ok((select edition_id = :'ed2' from public.find_by_isbn('0-8044-2957-x')), 'ISBN-10 ile baskı bulunur');
reset role;
select 'editions ok';
