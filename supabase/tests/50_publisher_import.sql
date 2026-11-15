-- Yayınevi sitesinden içe aktarma (import_publisher_book, migration 0011)
\set ON_ERROR_STOP 1

set role authenticated;
select t.throws($$select public.import_publisher_book('{"kind":"book","title":"x","source":"publisher_feed"}')$$,
  'istemci import_publisher_book çağıramaz');
reset role;
select t.throws($$select public.import_publisher_book('{"kind":"book","title":"x","source":"user"}')$$,
  'yalnızca publisher_feed kaynağı kabul edilir');

select public.import_publisher_book($j${
  "kind":"book","title":"Rüzgâr Defteri","year":2026,"source":"publisher_feed","language":"tr",
  "cover_url":"https://iletisim.com.tr/Images/UserFiles/Images/Spot/ruzgar.jpg",
  "external_ids":[{"source":"publisher_feed","external_id":"iletisim:99001"},{"source":"isbn","external_id":"9789750599990"}],
  "contributors":[{"name":"Lea Morin","role":"author","order":0},{"name":"Deniz Kara","role":"editor","order":1},
                  {"name":"Su Aydın","role":"translator","order":2}],
  "book":{"isbn13":"9789750599990","publisher":"İletişim Yayınları","published_date":"2026-09","page_count":212,"translator":"Su Aydın"}
}$j$) as pub_id \gset

select public.import_publisher_book($j${
  "kind":"book","title":"Rüzgâr Defteri","source":"publisher_feed",
  "external_ids":[{"source":"publisher_feed","external_id":"iletisim:99001"}],
  "book":{"publisher":"İletişim Yayınları","page_count":212}
}$j$) as pub_again \gset

select t.ok(:'pub_id' = :'pub_again', 'aynı site kimliği tekrar gelince yeni kayıt açılmaz');
select t.ok((select count(*) from public.book_editions where media_id = :'pub_id') = 1, 'tek baskı');
select t.ok((select translator = 'Su Aydın' and edition_year = 2026 and cover_path like 'https://iletisim%'
             from public.book_editions where media_id = :'pub_id'), 'çevirmen, yıl ve kapak baskıya yazıldı');
select t.ok((select p.name = 'İletişim Yayınları' from public.book_editions e join public.publishers p on p.id = e.publisher_id
             where e.media_id = :'pub_id'), 'yayınevi bağlandı');
select t.ok((select array_agg(role::text order by sort_order) = '{author,editor,translator}'
             from public.media_contributors where media_id = :'pub_id'), 'yazar, editör ve çevirmen rolleri saklandı');
select t.ok((select subtitle = 'Lea Morin' from public.search_catalog('ruzgar defteri', 'book', 1)),
  'aramada alt başlık yalnızca yazarı gösterir');

select 'publisher import ok';
