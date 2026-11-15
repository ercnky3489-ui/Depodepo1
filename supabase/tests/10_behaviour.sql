-- BOOKFLIX davranış testleri. Her assert başarısızsa exception fırlatır ve çalıştırma durur.
\set ON_ERROR_STOP 1
\set A '''aaaaaaaa-0000-0000-0000-000000000001'''
\set B '''bbbbbbbb-0000-0000-0000-000000000002'''
\set C '''cccccccc-0000-0000-0000-000000000003'''
\set D '''dddddddd-0000-0000-0000-000000000004'''
\set M '''eeeeeeee-0000-0000-0000-000000000005'''
\set R1 '''ffffffff-0000-0000-0000-000000000006'''
\set R2 '''ffffffff-0000-0000-0000-000000000007'''

create schema if not exists t;
grant usage on schema t to authenticated;
create or replace function t.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'ASSERT FAILED: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;
create or replace function t.throws(stmt text, msg text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'ok - % (%)', msg, sqlerrm;
    return;
  end;
  raise exception 'ASSERT FAILED (beklenen hata gelmedi): %', msg;
end $$;
create or replace function t.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', u::text, false)
$$;
grant execute on all functions in schema t to authenticated;
create table t.ids (k text primary key, v uuid);
grant select, insert on t.ids to authenticated;

-- ---------------------------------------------------------------- kurulum (servis tarafı)
insert into auth.users (id, email, email_confirmed_at, created_at) values
  (:A, 'a@test', now(), now() - interval '60 days'),
  (:B, 'b@test', now(), now() - interval '60 days'),
  (:C, 'c@test', now(), now() - interval '60 days'),
  (:D, 'd@test', null, now()),
  (:M, 'm@test', now(), now() - interval '60 days'),
  (:R1, 'r1@test', now(), now() - interval '60 days'),
  (:R2, 'r2@test', now(), now() - interval '60 days');
select t.ok((select count(*) from public.profiles) = 7, 'yeni kullanıcıya profil ve ayar satırı açılır');
update public.profiles set created_at = now() - interval '60 days' where id <> :D;
update public.profiles set username = 'can', display_name = 'Can Öz' where id = :B;
update public.profiles set username = 'selin', is_private = true where id = :C;
update public.profiles set username = 'yeni' where id = :D;
update public.profiles set username = 'moderator' where id = :M;
update public.profiles set username = 'rapor1' where id = :R1;
update public.profiles set username = 'rapor2' where id = :R2;
insert into public.app_roles values (:M, 'moderator');

with b as (
  insert into public.media_items (kind, title, year, source) values ('book', 'Kırık Saatler', 2023, 'open_library') returning id
) insert into t.ids select 'book', id from b;
insert into public.book_details (media_id, isbn13, page_count) select v, '9780000000001', 384 from t.ids where k = 'book';
with c as (insert into public.contributors (name) values ('Leyla Aras') returning id)
insert into public.media_contributors (media_id, contributor_id, role) select (select v from t.ids where k = 'book'), id, 'author' from c;
with m as (insert into public.media_items (kind, title, year, source) values ('movie', 'Gece Treni', 2025, 'tmdb') returning id)
insert into t.ids select 'movie', id from m;
with s as (insert into public.media_items (kind, title, year, source) values ('series', 'Sessiz Liman', 2024, 'tmdb') returning id)
insert into t.ids select 'series', id from s;
insert into public.seasons (media_id, season_number) select v, n from t.ids, generate_series(1, 2) n where k = 'series';
insert into public.episodes (season_id, episode_number, title)
  select s.id, e, 'Bölüm ' || e from public.seasons s, generate_series(1, 3) e
  where s.media_id = (select v from t.ids where k = 'series');
insert into t.ids select 's1e3', e.id from public.episodes e join public.seasons s on s.id = e.season_id
  where s.season_number = 1 and e.episode_number = 3;
select t.ok((select count(*) from public.media_stats) = 3, 'her esere istatistik satırı açılır');

-- ---------------------------------------------------------------- kayıt ve takip
select t.as_user(:A);
set role authenticated;
select t.ok(public.username_available('aysekara'), 'kullanıcı adı uygun');
select t.ok(not public.username_available('can'), 'alınmış kullanıcı adı uygun değil');
select t.ok(not public.username_available('a b'), 'geçersiz kullanıcı adı reddedilir');
select public.complete_onboarding('aysekara', 'Ayşe Kara', 'Gece okuru', 'kvkk-2026-11', true, false);
select t.ok((select onboarded_at is not null from public.profiles where id = auth.uid()), 'onboarding tamamlandı');
select t.ok((select count(*) from public.consents where user_id = auth.uid()) = 4, 'KVKK ve rıza kayıtları sürümlü saklandı');
update public.profiles set total_xp = 99999, level = 10, follower_count = 500 where id = auth.uid();
select t.ok((select total_xp = 0 and level = 1 and follower_count = 0 from public.profiles where id = auth.uid()),
  'kullanıcı kendi XP/seviye/sayaçlarını değiştiremez');
reset role;

select t.as_user(:B);
set role authenticated;
insert into public.follows (follower_id, followee_id) values (auth.uid(), :A);
insert into public.follows (follower_id, followee_id) values (auth.uid(), :C);
select t.ok((select status from public.follows where follower_id = auth.uid() and followee_id = :C) = 'pending', 'gizli hesabı takip isteği beklemede');
select t.throws($$insert into public.follows (follower_id, followee_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003')$$,
  'başkası adına takip edilemez');
reset role;
select t.ok((select follower_count from public.profiles where id = :A) = 1, 'takipçi sayısı tetikleyiciyle arttı');
select t.ok((select count(*) from public.notifications where recipient_id = :A and type = 'follow') = 1, 'takip bildirimi oluştu');
select t.ok((select count(*) from public.notifications where recipient_id = :C and type = 'follow_request') = 1, 'takip isteği bildirimi oluştu');

select t.as_user(:C);
set role authenticated;
update public.follows set status = 'accepted' where follower_id = :B and followee_id = auth.uid();
reset role;
select t.ok((select count(*) from public.notifications where recipient_id = :B and type = 'follow_accepted') = 1, 'istek kabul bildirimi');
select t.ok((select follower_count from public.profiles where id = :C) = 1, 'kabul sonrası takipçi sayısı');

-- ---------------------------------------------------------------- kütüphane ve XP
select t.as_user(:A);
set role authenticated;
insert into public.library_entries (user_id, media_id, status, current_page) values (auth.uid(), (select v from t.ids where k = 'book'), 'in_progress', 24);
select t.ok((select total_xp from public.profiles where id = auth.uid()) = 2, 'okumaya başlama +2 XP');
update public.library_entries set status = 'planned' where user_id = auth.uid();
update public.library_entries set status = 'in_progress' where user_id = auth.uid();
select t.ok((select total_xp from public.profiles where id = auth.uid()) = 2, 'aynı kitap için okumaya başlama XP''si bir kez verilir');
select t.ok((select count(*) from public.activities where actor_id = auth.uid() and verb = 'started_reading') >= 1, 'okumaya başladı aktivitesi yazıldı');
select t.throws($$insert into public.xp_ledger (user_id, action, source_type, source_id, xp) values (auth.uid(), 'quote_book', 'x', gen_random_uuid(), 1000)$$,
  'istemci XP defterine yazamaz');
select t.throws($$select public.award_xp(auth.uid(), 'quote_book', 'x', gen_random_uuid())$$, 'istemci award_xp çağıramaz');

insert into public.quotes (user_id, media_id, body, page_number) values
  (auth.uid(), (select v from t.ids where k = 'book'), 'Bazı saatler hiç durmaz; biz onları kırdığımızı sanırız, oysa yalnızca dinlemeyi bırakmışızdır.', 142);
select t.ok((select total_xp from public.profiles where id = auth.uid()) = 22, 'kitap alıntısı +20 XP');
insert into public.quotes (user_id, media_id, body, page_number) values (auth.uid(), (select v from t.ids where k = 'book'), 'Çok güzel.', 10);
select t.ok((select withheld_reason from public.xp_ledger l join public.quotes q on q.id = l.source_id where q.body = 'Çok güzel.') = 'too_short',
  'kısa alıntıya XP verilmez (too_short)');
insert into public.quotes (user_id, media_id, body, page_number) values
  (auth.uid(), (select v from t.ids where k = 'book'), 'Bazı  saatler hiç durmaz; biz onları kırdığımızı sanırız, oysa yalnızca dinlemeyi bırakmışızdır.', 143);
select t.ok((select l.withheld_reason from public.xp_ledger l join public.quotes q on q.id = l.source_id where q.page_number = 143) = 'duplicate',
  'tekrar eden alıntıya XP verilmez (duplicate)');
insert into public.quotes (user_id, media_id, body, page_number) values
  (auth.uid(), (select v from t.ids where k = 'book'), 'aaaaaaaaaaaa aaaaaaaaaa aaaaaaab aaaaaaaaaaaaaaa aaaaaaaaaaaaaaaaaa ab ab ab ab ab ab ab ab ab ab ab', 5);
select t.ok((select l.withheld_reason from public.xp_ledger l join public.quotes q on q.id = l.source_id where q.page_number = 5) in ('repetitive', 'too_short'),
  'tekrarlayan karakterli metne XP verilmez');
insert into public.quotes (user_id, media_id, body) values
  (auth.uid(), (select v from t.ids where k = 'movie'), 'Herkes bir istasyonda iner. Mesele, hangisinde inmeyi seçtiğindir, gerisi yalnızca yolculuk.');
select t.ok((select l.withheld_reason from public.xp_ledger l join public.quotes q on q.id = l.source_id
             where q.media_id = (select v from t.ids where k = 'movie')) = 'no_scene_note', 'sahne notu olmayan film alıntısına XP verilmez');
select t.ok((select total_xp from public.profiles where id = auth.uid()) = 22, 'geçersiz alıntılar toplamı değiştirmedi');

insert into public.reviews (user_id, media_id, title, body, rating) values
  (auth.uid(), (select v from t.ids where k = 'book'), 'Saatlerin sessizliği',
   repeat('Leyla Aras zamanı bir karakter gibi kuruyor; her bölüm bir saatin tik takıyla açılıyor ve kapanıyor. ', 5), 8);
select t.ok((select total_xp from public.profiles where id = auth.uid()) = 82, 'kitap incelemesi +60 XP');
select t.ok((select rating from public.library_entries where user_id = auth.uid() and media_id = (select v from t.ids where k = 'book')) = 8,
  'inceleme puanı kütüphane puanına yansıdı');
select t.ok((select user_rating_avg from public.media_stats where media_id = (select v from t.ids where k = 'book')) = 8,
  'BOOKFLIX ortalaması yalnızca kullanıcı puanından hesaplandı');
select t.throws($$insert into public.reviews (user_id, media_id, body, rating) values (auth.uid(), (select v from t.ids where k = 'book'), 'ikinci inceleme', 5)$$,
  'aynı esere ikinci inceleme yazılamaz');
insert into public.reviews (user_id, media_id, title, body, rating) values
  (auth.uid(), (select v from t.ids where k = 'movie'), 'İzlemeden',
   repeat('Fragmanı izledim ve yönetmenin önceki filmlerini bildiğim için bu filmin de çok güçlü olacağını düşünüyorum. ', 4), 9);
select t.ok((select l.withheld_reason from public.xp_ledger l join public.reviews r on r.id = l.source_id
             where r.media_id = (select v from t.ids where k = 'movie')) = 'not_watched', 'izlenmemiş filme inceleme XP almaz');
update public.reviews set body = 'Kısalttım.' where media_id = (select v from t.ids where k = 'book') and user_id = auth.uid();
select t.ok((select total_xp from public.profiles where id = auth.uid()) = 22, 'inceleme şartın altına kısaltılınca XP geri alındı');
update public.reviews set body = repeat('Leyla Aras zamanı bir karakter gibi kuruyor; her bölüm bir saatin tik takıyla açılıyor ve kapanıyor. ', 5)
  where media_id = (select v from t.ids where k = 'book') and user_id = auth.uid();
insert into t.ids select 'a_quote', id from public.quotes where page_number = 142;
insert into t.ids select 'a_review', id from public.reviews where media_id = (select v from t.ids where k = 'book') and user_id = auth.uid();
reset role;

-- ---------------------------------------------------------------- beğeni ve faydalı oy
select t.as_user(:B);
set role authenticated;
select * from public.toggle_like('quote', (select v from t.ids where k = 'a_quote'));
select t.ok((select like_count from public.quotes where id = (select v from t.ids where k = 'a_quote')) = 1, 'beğeni sayacı arttı');
select t.ok(public.content_owner('quote', (select v from t.ids where k = 'a_quote')) = :A, 'içerik sahibi bulunur');
select * from public.toggle_helpful((select v from t.ids where k = 'a_review'));
select t.ok((select helpful_count from public.reviews where id = (select v from t.ids where k = 'a_review')) = 1, 'faydalı sayacı arttı');
reset role;
select t.ok((select total_xp from public.profiles where id = :A) = 22 + 1 + 3, 'beğeni +1, faydalı +3 XP sahibine yazıldı');
select t.ok((select count(*) from public.notifications where recipient_id = :A and type in ('like', 'helpful')) = 2, 'beğeni ve faydalı bildirimleri');

select t.as_user(:A);
set role authenticated;
select t.throws($$select public.toggle_helpful((select v from t.ids where k = 'a_review'))$$, 'kendi incelemesini faydalı bulamaz');
select public.toggle_like('quote', (select v from t.ids where k = 'a_quote'));
select t.ok((select total_xp from public.profiles where id = auth.uid()) = 26, 'kendi içeriğini beğenmek XP vermez');
update public.quotes set like_count = 1000 where id = (select v from t.ids where k = 'a_quote');
reset role;
select t.ok((select like_count from public.quotes where id = (select v from t.ids where k = 'a_quote')) = 2, 'istemci beğeni sayacını değiştiremez');

select t.as_user(:D);
set role authenticated;
select public.toggle_like('quote', (select v from t.ids where k = 'a_quote'));
reset role;
select t.ok((select withheld_reason from public.xp_ledger where user_id = :A and action = 'content_liked' order by created_at desc limit 1) = 'liker_too_new',
  '24 saatten yeni hesabın beğenisi XP üretmez');

select t.as_user(:B);
set role authenticated;
select public.toggle_like('quote', (select v from t.ids where k = 'a_quote'));
reset role;
select t.ok((select total_xp from public.profiles where id = :A) = 25, 'beğeni geri alınınca XP düştü');

-- ---------------------------------------------------------------- akış
select t.as_user(:B);
set role authenticated;
select t.ok((select count(*) from public.get_feed('all') where (actor->>'id')::uuid = :A) >= 3, 'takip edilenin aktiviteleri akışta');
select t.ok((select bool_and(verb = 'quoted') from public.get_feed('quotes')), 'Alıntılar filtresi yalnızca alıntı döndürür');
select t.ok((select bool_and(verb = 'reviewed') from public.get_feed('reviews')), 'İncelemeler filtresi yalnızca inceleme döndürür');
select t.ok((select bool_and((media->>'kind') = 'book') from public.get_feed('books')), 'Kitaplar filtresi yalnızca kitap döndürür');
select t.ok((select count(*) from public.get_feed('all', now() - interval '1 day')) = 0, 'sayfalama imleci çalışır');
reset role;

-- ---------------------------------------------------------------- gizli hesap ve engelleme
select t.as_user(:C);
set role authenticated;
insert into public.library_entries (user_id, media_id, status) values (auth.uid(), (select v from t.ids where k = 'book'), 'in_progress');
insert into public.quotes (user_id, media_id, body, page_number) values
  (auth.uid(), (select v from t.ids where k = 'book'), 'Saatin içinde bir kuş yaşıyordu ve yalnızca gece yarısı şarkı söylüyordu, herkes uyurken.', 77);
reset role;
select t.as_user(:A);
set role authenticated;
select t.ok((select count(*) from public.quotes where user_id = :C) = 0, 'takipçi olmayan gizli hesabın alıntısını göremez');
reset role;
select t.as_user(:B);
set role authenticated;
select t.ok((select count(*) from public.quotes where user_id = :C) = 1, 'onaylı takipçi gizli hesabın alıntısını görür');
reset role;
select t.as_user(:C);
set role authenticated;
insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), :B);
reset role;
select t.ok(not exists (select 1 from public.follows where follower_id = :B and followee_id = :C), 'engelleme takibi kaldırır');
select t.as_user(:B);
set role authenticated;
select t.ok((select count(*) from public.quotes where user_id = :C) = 0, 'engellenen kişi içeriği göremez');
select t.throws($$insert into public.follows (follower_id, followee_id) values (auth.uid(), 'cccccccc-0000-0000-0000-000000000003')$$, 'engelleyeni takip edemez');
update public.quotes set body = 'hack' where id = (select v from t.ids where k = 'a_quote');
reset role;
select t.ok((select body from public.quotes where id = (select v from t.ids where k = 'a_quote')) like 'Bazı saatler%', 'başkasının alıntısı değiştirilemez');

-- ---------------------------------------------------------------- dizi takibi
select t.as_user(:A);
set role authenticated;
select t.ok(public.mark_watched_until((select v from t.ids where k = 's1e3')) = 3, 'buraya kadar izledim: 3 bölüm işaretlendi');
select t.ok((select status from public.library_entries where user_id = auth.uid() and media_id = (select v from t.ids where k = 'series')) = 'in_progress',
  'ilk bölüm diziyi İzliyorum yaptı');
select t.ok((select watched = 3 and total = 6 and next_season = 2 and next_episode = 1 from public.series_progress((select v from t.ids where k = 'series'))),
  'dizi ilerlemesi ve sıradaki bölüm doğru');
select t.ok(exists (select 1 from public.activities where actor_id = auth.uid() and verb = 'watching_series'), 'dizi izliyor aktivitesi');
insert into public.episode_progress (user_id, episode_id)
  select auth.uid(), e.id from public.episodes e join public.seasons s on s.id = e.season_id
  where s.media_id = (select v from t.ids where k = 'series') and s.season_number = 2;
select t.ok((select status from public.library_entries where user_id = auth.uid() and media_id = (select v from t.ids where k = 'series')) = 'completed',
  'tüm bölümler izlenince dizi İzledim oldu');
reset role;

-- ---------------------------------------------------------------- arama
select t.as_user(:B);
set role authenticated;
select t.ok((select title from public.search_catalog('kirik saat') limit 1) = 'Kırık Saatler', 'aksansız arama Türkçe başlığı bulur');
select t.ok((select count(*) from public.search_catalog('gece', 'movie')) = 1, 'türe göre arama');
select t.ok((select count(*) from public.search_people('ayse')) = 1, 'kişi araması');
select t.ok((select count(*) from public.search_contributors('leyla')) = 1, 'yazar araması');
select t.ok((select title from public.search_catalog('leyla aras') limit 1) = 'Kırık Saatler', 'yazar adıyla kitap araması');
reset role;

-- ---------------------------------------------------------------- şikayet ve moderasyon
select t.as_user(:B);  set role authenticated;
insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'quote', (select v from t.ids where k = 'a_quote'), 'spam');
reset role;
select t.as_user(:R1); set role authenticated;
insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'quote', (select v from t.ids where k = 'a_quote'), 'spam');
reset role;
select t.ok((select status from public.quotes where id = (select v from t.ids where k = 'a_quote')) = 'visible', '2 şikayet içeriği gizlemez');
select t.as_user(:R2); set role authenticated;
insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'quote', (select v from t.ids where k = 'a_quote'), 'spam');
select t.ok((select count(*) from public.quotes where id = (select v from t.ids where k = 'a_quote')) = 0, '3. şikayette içerik başkalarından gizlenir');
reset role;
select t.as_user(:A); set role authenticated;
select t.ok((select count(*) from public.quotes where id = (select v from t.ids where k = 'a_quote')) = 1, 'sahibi gizlenen içeriğini görmeye devam eder');
select t.throws($$insert into public.moderation_actions (moderator_id, target_type, target_id, action) values (auth.uid(), 'quote', gen_random_uuid(), 'remove')$$,
  'moderatör olmayan moderasyon yapamaz');
reset role;
select t.as_user(:M); set role authenticated;
insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (auth.uid(), 'quote', (select v from t.ids where k = 'a_quote'), 'remove', 'spam');
reset role;
select t.ok((select status from public.quotes where id = (select v from t.ids where k = 'a_quote')) = 'removed', 'moderatör içeriği kaldırdı');
select t.ok((select reversed_at is not null from public.xp_ledger where source_id = (select v from t.ids where k = 'a_quote') and action = 'quote_book'),
  'kaldırılan alıntının XP''si geri alındı');
select t.ok((select count(*) from public.reports where target_id = (select v from t.ids where k = 'a_quote') and status = 'actioned') = 3, 'şikayetler kapatıldı');
select t.ok(exists (select 1 from public.notifications where recipient_id = :A and type = 'moderation'), 'sahibine moderasyon bildirimi');

-- ---------------------------------------------------------------- günlük sınır ve hız sınırı
update public.xp_settings set posts_per_10_min = 100;
select t.as_user(:B); set role authenticated;
insert into public.library_entries (user_id, media_id, status) values (auth.uid(), (select v from t.ids where k = 'book'), 'completed');
insert into public.quotes (user_id, media_id, body, page_number)
  select auth.uid(), (select v from t.ids where k = 'book'),
    'Bu alıntı numarası ' || n || ': ' || (array['deniz', 'gölge', 'kuzey', 'liman', 'kış', 'saat', 'ışık'])[n] || ' üzerine uzun ve özgün bir cümle, tamamen farklı kelimelerle ' || md5(n::text), n
  from generate_series(1, 7) n;
reset role;
select t.ok((select count(*) from public.xp_ledger where user_id = :B and action = 'quote_book' and xp = 20) = 5, 'günde en fazla 5 alıntı XP alır');
select t.ok((select count(*) from public.xp_ledger where user_id = :B and withheld_reason = 'daily_count_cap') = 2, 'fazlası daily_count_cap ile kaydedilir');
update public.xp_settings set posts_per_10_min = 7;
select t.as_user(:B); set role authenticated;
select t.throws($$insert into public.quotes (user_id, media_id, body) values (auth.uid(), (select v from t.ids where k = 'book'), 'Bir tane daha alıntı denemesi burada yapılıyor')$$,
  '10 dakikada sınırı aşan paylaşım engellenir');
reset role;
update public.xp_settings set posts_per_10_min = 10;

-- ---------------------------------------------------------------- rozet ve seviye
insert into public.media_items (kind, title, source) select 'book', 'Test Kitabı ' || n, 'open_library' from generate_series(1, 10) n;
insert into public.book_details (media_id, page_count) select id, 520 from public.media_items where title like 'Test Kitabı %';
select t.as_user(:A); set role authenticated;
insert into public.library_entries (user_id, media_id, status)
  select auth.uid(), id, 'completed' from public.media_items where title like 'Test Kitabı %';
reset role;
select t.ok((select ub.tier from public.user_badges ub join public.badges b on b.id = ub.badge_id where ub.user_id = :A and b.code = 'book_worm') = 1,
  '10 kitap: Kitap Kurdu bronz');
select t.ok((select ub.tier from public.user_badges ub join public.badges b on b.id = ub.badge_id where ub.user_id = :A and b.code = 'long_reader') = 2,
  '10 uzun kitap: Uzun Okur gümüş');
select t.ok(exists (select 1 from public.notifications where recipient_id = :A and type = 'badge'), 'rozet bildirimi');
select t.ok((select level from public.profiles where id = :A) = (select max(level) from public.levels where min_xp <= (select total_xp from public.profiles where id = :A)),
  'seviye toplam XP ile tutarlı');
select t.ok((select total_xp from public.profiles where id = :A) <= 300 + 300, 'günlük toplam tavan aşılmadı');
select t.ok((select sum(xp) from public.xp_ledger where user_id = :A and day = public.istanbul_today() and reversed_at is null) <= 300, 'günlük 300 XP tavanı');

-- ---------------------------------------------------------------- bildirim okundu
select t.as_user(:A); set role authenticated;
update public.notifications set read_at = now() where recipient_id = auth.uid();
select t.ok((select count(*) from public.notifications where recipient_id = auth.uid() and read_at is null) = 0, 'bildirimler okundu işaretlendi');
select t.throws($$update public.notifications set type = 'badge' where recipient_id = auth.uid()$$, 'bildirimde yalnızca read_at değişir');
select t.ok((public.profile_summary(auth.uid())->'badges'->0->>'code') = 'book_worm', 'profil özeti rozetleri döndürür');
reset role;

-- ---------------------------------------------------------------- hesap silme
select t.as_user(:A); set role authenticated;
select public.request_account_deletion();
reset role;
select t.as_user(:B); set role authenticated;
select t.ok((select count(*) from public.reviews where user_id = :A) = 0, 'silme talebinden sonra içerik başkalarına görünmez');
select t.ok((select count(*) from public.get_feed('all') where (actor->>'id')::uuid = :A) = 0, 'silinen hesap akışta görünmez');
reset role;
update public.deletion_requests set purge_after = now() - interval '1 minute' where user_id = :A;
select t.ok(public.purge_deleted_accounts() = 1, 'kalıcı silme çalıştı');
select t.ok(not exists (select 1 from public.profiles where id = :A), 'profil silindi');
select t.ok(not exists (select 1 from public.quotes where user_id = :A) and not exists (select 1 from public.xp_ledger where user_id = :A),
  'kullanıcının tüm içeriği ve XP kaydı silindi');
select t.ok((select user_rating_count from public.media_stats where media_id = (select v from t.ids where k = 'book')) = 0,
  'silinen kullanıcının puanı ortalamadan düştü');
