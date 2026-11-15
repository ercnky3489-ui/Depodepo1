-- Keşfet RPC'leri: benzer kullanıcılar, öneriler, trendler, haftanın içerikleri
\set ON_ERROR_STOP 1
\set U1 '''11111111-0000-0000-0000-000000000001'''
\set U2 '''22222222-0000-0000-0000-000000000002'''
\set U3 '''33333333-0000-0000-0000-000000000003'''

insert into auth.users (id, email, email_confirmed_at, created_at) values
  (:U1, 'u1@test', now(), now() - interval '90 days'),
  (:U2, 'u2@test', now(), now() - interval '90 days'),
  (:U3, 'u3@test', now(), now() - interval '90 days');
update public.profiles set created_at = now() - interval '90 days', username = 'okur_' || left(id::text, 1)
  where id in (:U1, :U2, :U3);
update public.xp_settings set posts_per_10_min = 100;

insert into public.media_items (kind, title, source) select 'book', 'Keşif ' || n, 'open_library' from generate_series(1, 6) n;

-- U1 ve U2 aynı 4 kitaba yakın puanlar veriyor; U2 ayrıca "Keşif 5"e 9 veriyor.
insert into public.library_entries (user_id, media_id, status, rating)
  select :U1, id, 'completed', 8 from public.media_items where title in ('Keşif 1', 'Keşif 2', 'Keşif 3', 'Keşif 4');
insert into public.library_entries (user_id, media_id, status, rating)
  select :U2, id, 'completed', case when title = 'Keşif 5' then 9 else 9 end from public.media_items where title in ('Keşif 1', 'Keşif 2', 'Keşif 3', 'Keşif 4', 'Keşif 5');
-- U3 zıt zevkte
insert into public.library_entries (user_id, media_id, status, rating)
  select :U3, id, 'completed', 2 from public.media_items where title in ('Keşif 1', 'Keşif 2', 'Keşif 3', 'Keşif 6');

select t.as_user(:U1);
set role authenticated;
select t.ok((select id from public.similar_users(5) order by match desc limit 1) = :U2, 'en benzer kullanıcı yakın puan veren kişidir');
select t.ok((select match from public.similar_users(5) where id = :U2) between 85 and 100, 'zevk uyumu yüzdesi hesaplanır');
select t.ok((select match from public.similar_users(5) where id = :U3) < 40, 'zıt zevkli kullanıcının uyumu düşüktür');
select t.ok((select title from public.recommendations('book', 5) limit 1) = 'Keşif 5', 'öneri, benzer kullanıcının 8+ verdiği ve bende olmayan eserdir');
select t.ok(not exists (select 1 from public.recommendations('book', 10) where title in ('Keşif 1', 'Keşif 2', 'Keşif 3', 'Keşif 4')),
  'kütüphanemdeki eserler önerilmez');
select t.ok((select count(*) from public.trending_media('book', 7, 10)) >= 6, 'son 7 günün trend kitapları');
reset role;

select t.as_user(:U2);
set role authenticated;
insert into public.reviews (user_id, media_id, title, body, rating)
  select auth.uid(), id, 'Keşfin incelemesi', repeat('Uzun, dikkatli ve özgün bir inceleme cümlesi; kurgu, karakter ve dil üzerine. ', 5), 9
  from public.media_items where title = 'Keşif 5';
insert into public.quotes (user_id, media_id, body, page_number)
  select auth.uid(), id, 'Keşfin en güzel cümlesi burada, uzun ve özgün bir alıntı olarak duruyor.', 12 from public.media_items where title = 'Keşif 5';
reset role;
select t.as_user(:U1);
set role authenticated;
select public.toggle_helpful((select id from public.reviews where title = 'Keşfin incelemesi'));
select public.toggle_like('quote', (select id from public.quotes where page_number = 12 and user_id = :U2));
insert into public.saves (user_id, target_type, target_id) values (auth.uid(), 'quote', (select id from public.quotes where page_number = 12 and user_id = :U2));
select t.ok((select title from public.top_reviews(7, 5) limit 1) = 'Keşfin incelemesi', 'haftanın en faydalı incelemesi');
select t.ok((select page_number from public.top_quotes(7, 5) limit 1) = 12, 'haftanın en çok paylaşılan alıntısı');
select t.ok((public.profile_summary(:U2)->'stats'->>'books_completed')::int = 5, 'profil istatistikleri');
reset role;
update public.xp_settings set posts_per_10_min = 10;
