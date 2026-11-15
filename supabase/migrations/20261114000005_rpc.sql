-- BOOKFLIX · 0005 · İstemcinin çağırdığı RPC'ler
-- Okuma RPC'leri security invoker çalışır: RLS her satıra uygulanır.

-- ---------------------------------------------------------------- ana akış
-- p_filter: all | books | films | series | quotes | reviews
create or replace function public.get_feed(
  p_filter text default 'all',
  p_before timestamptz default null,
  p_limit integer default 20
) returns table (
  id uuid,
  verb public.activity_verb,
  created_at timestamptz,
  actor jsonb,
  media jsonb,
  object jsonb,
  target_user jsonb,
  liked_by_me boolean,
  saved_by_me boolean
)
language sql stable security invoker set search_path = '' as $$
  with me as (select auth.uid() as uid),
  circle as (
    select f.followee_id as uid from public.follows f, me where f.follower_id = me.uid and f.status = 'accepted'
    union select uid from me
  )
  select
    a.id, a.verb, a.created_at,
    jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name,
                       'avatar_path', p.avatar_path, 'level', p.level) as actor,
    case when m.id is null then null else jsonb_build_object(
      'id', m.id, 'kind', m.kind, 'title', m.title, 'year', m.year, 'cover_path', m.cover_path,
      'backdrop_path', m.backdrop_path,
      'authors', (select coalesce(jsonb_agg(c.name order by mc.sort_order), '[]'::jsonb)
                  from public.media_contributors mc join public.contributors c on c.id = mc.contributor_id
                  where mc.media_id = m.id and mc.role in ('author', 'director', 'creator')),
      'page_count', (select b.page_count from public.book_details b where b.media_id = m.id),
      'app_rating', (select s.user_rating_avg from public.media_stats s where s.media_id = m.id)
    ) end as media,
    case
      when a.object_type = 'quote' then (select to_jsonb(q) - 'body_hash' from public.quotes q where q.id = a.object_id)
      when a.object_type = 'review' then (select to_jsonb(r) - 'body_hash' from public.reviews r where r.id = a.object_id)
      when a.object_type = 'list' then (
        select to_jsonb(l) || jsonb_build_object('covers', (
          select coalesce(jsonb_agg(mi.cover_path order by li.position), '[]'::jsonb)
          from (select * from public.list_items where list_id = l.id order by position limit 4) li
          join public.media_items mi on mi.id = li.media_id))
        from public.lists l where l.id = a.object_id)
      when a.object_type = 'media' then (
        select to_jsonb(le) from public.library_entries le where le.user_id = a.actor_id and le.media_id = a.media_id)
      when a.object_type = 'like' then (
        select jsonb_build_object('target_type', lk.target_type, 'target_id', lk.target_id) from public.likes lk where lk.id = a.object_id)
    end as object,
    case when tu.id is null then null else jsonb_build_object('id', tu.id, 'username', tu.username, 'display_name', tu.display_name, 'avatar_path', tu.avatar_path) end,
    exists (select 1 from public.likes lk, me where lk.user_id = me.uid and lk.target_id = a.object_id
            and lk.target_type::text = a.object_type),
    exists (select 1 from public.saves sv, me where sv.user_id = me.uid and sv.target_id = a.object_id
            and sv.target_type::text = a.object_type)
  from public.activities a
  join circle on circle.uid = a.actor_id
  join public.profiles p on p.id = a.actor_id
  left join public.media_items m on m.id = a.media_id
  left join public.profiles tu on tu.id = a.target_user_id
  where (p_before is null or a.created_at < p_before)
    and case coalesce(p_filter, 'all')
      when 'all' then true
      when 'books' then m.kind = 'book'
      when 'films' then m.kind = 'movie'
      when 'series' then m.kind = 'series'
      when 'quotes' then a.verb = 'quoted'
      when 'reviews' then a.verb = 'reviewed'
      else true
    end
    and (a.object_type not in ('quote', 'review') or exists (
      select 1 from public.quotes q where a.object_type = 'quote' and q.id = a.object_id
      union all
      select 1 from public.reviews r where a.object_type = 'review' and r.id = a.object_id))
  order by a.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

-- ---------------------------------------------------------------- etkileşim kısayolları
create or replace function public.toggle_like(p_type public.target_type, p_id uuid)
returns table (liked boolean, like_count integer)
language plpgsql security invoker set search_path = '' as $$
declare
  existing uuid;
begin
  select id into existing from public.likes where user_id = auth.uid() and target_type = p_type and target_id = p_id;
  if existing is null then
    insert into public.likes (user_id, target_type, target_id) values (auth.uid(), p_type, p_id);
    liked := true;
  else
    delete from public.likes where id = existing;
    liked := false;
  end if;
  like_count := case p_type
    when 'quote' then (select q.like_count from public.quotes q where q.id = p_id)
    when 'review' then (select r.like_count from public.reviews r where r.id = p_id)
    when 'list' then (select l.like_count from public.lists l where l.id = p_id)
    when 'comment' then (select c.like_count from public.comments c where c.id = p_id)
    when 'community_post' then (select cp.like_count from public.community_posts cp where cp.id = p_id)
  end;
  return next;
end
$$;

create or replace function public.toggle_helpful(p_review uuid)
returns table (helpful boolean, helpful_count integer)
language plpgsql security invoker set search_path = '' as $$
begin
  if exists (select 1 from public.review_helpful_votes where user_id = auth.uid() and review_id = p_review) then
    delete from public.review_helpful_votes where user_id = auth.uid() and review_id = p_review;
    helpful := false;
  else
    insert into public.review_helpful_votes (user_id, review_id) values (auth.uid(), p_review);
    helpful := true;
  end if;
  select r.helpful_count into helpful_count from public.reviews r where r.id = p_review;
  return next;
end
$$;

-- Bölüm ve öncesindeki tüm bölümleri izlendi işaretler ("buraya kadar izledim").
create or replace function public.mark_watched_until(p_episode uuid) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  m uuid;
  sn smallint;
  en smallint;
  n integer;
begin
  select s.media_id, s.season_number, e.episode_number into m, sn, en
  from public.episodes e join public.seasons s on s.id = e.season_id where e.id = p_episode;
  if m is null then
    raise exception 'episode_not_found' using errcode = 'P0001';
  end if;
  insert into public.episode_progress (user_id, episode_id)
  select auth.uid(), e.id
  from public.episodes e join public.seasons s on s.id = e.season_id
  where s.media_id = m and s.season_number > 0
    and (s.season_number < sn or (s.season_number = sn and e.episode_number <= en))
  order by s.season_number, e.episode_number
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end
$$;

-- Dizide kullanıcının ilerlemesi ve sıradaki bölüm
create or replace function public.series_progress(p_media uuid)
returns table (watched integer, total integer, next_episode_id uuid, next_season smallint, next_episode smallint, next_title text)
language sql stable security invoker set search_path = '' as $$
  with eps as (
    select e.id, s.season_number, e.episode_number, e.title,
           exists (select 1 from public.episode_progress p where p.user_id = auth.uid() and p.episode_id = e.id) as seen
    from public.episodes e join public.seasons s on s.id = e.season_id
    where s.media_id = p_media and s.season_number > 0
  ), nxt as (
    select * from eps where not seen order by season_number, episode_number limit 1
  )
  select (select count(*)::integer from eps where seen), (select count(*)::integer from eps),
         nxt.id, nxt.season_number, nxt.episode_number, nxt.title
  from (select 1) one left join nxt on true
$$;

-- ---------------------------------------------------------------- arama
create or replace function public.search_catalog(q text, p_kind public.media_kind default null, p_limit integer default 20)
returns table (id uuid, kind public.media_kind, title text, year smallint, cover_path text, subtitle text, rank real)
language sql stable security invoker set search_path = '' as $$
  with nq as (select public.normalize_text(q) as t)
  select m.id, m.kind, m.title, m.year, m.cover_path,
    (select string_agg(c.name, ', ' order by mc.sort_order) from public.media_contributors mc
       join public.contributors c on c.id = mc.contributor_id
       where mc.media_id = m.id and mc.role in ('author', 'director', 'creator')) as subtitle,
    (ts_rank(m.search_vector, plainto_tsquery('simple', nq.t)) + extensions.similarity(lower(public.f_unaccent(m.title)), nq.t))::real as rank
  from public.media_items m, nq
  where char_length(nq.t) >= 2
    and (p_kind is null or m.kind = p_kind)
    and (m.search_vector @@ plainto_tsquery('simple', nq.t)
         or lower(public.f_unaccent(m.title)) operator(extensions.%) nq.t
         or lower(public.f_unaccent(m.title)) like '%' || nq.t || '%'
         or exists (select 1 from public.media_contributors mc join public.contributors c on c.id = mc.contributor_id
                    where mc.media_id = m.id and mc.role in ('author', 'director', 'creator')
                      and lower(public.f_unaccent(c.name)) like '%' || nq.t || '%'))
  order by rank desc, (select s.reader_count from public.media_stats s where s.media_id = m.id) desc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

create or replace function public.search_people(q text, p_limit integer default 20)
returns table (id uuid, username text, display_name text, avatar_path text, level integer, is_following boolean)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.username::text, p.display_name, p.avatar_path, p.level,
    exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = p.id)
  from public.profiles p
  where char_length(q) >= 2 and p.username is not null and p.id <> auth.uid()
    and (p.username::text ilike '%' || q || '%' or public.f_unaccent(coalesce(p.display_name, '')) ilike '%' || public.f_unaccent(q) || '%')
  order by p.follower_count desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

create or replace function public.search_contributors(q text, p_role public.contributor_role default 'author', p_limit integer default 20)
returns table (id uuid, name text, photo_path text, work_count integer)
language sql stable security invoker set search_path = '' as $$
  select c.id, c.name, c.photo_path,
    (select count(*)::integer from public.media_contributors mc where mc.contributor_id = c.id and mc.role = p_role)
  from public.contributors c
  where char_length(q) >= 2
    and exists (select 1 from public.media_contributors mc where mc.contributor_id = c.id and mc.role = p_role)
    and lower(public.f_unaccent(c.name)) like '%' || public.normalize_text(q) || '%'
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

-- ---------------------------------------------------------------- keşfet
-- Son N günde en çok başlanan kitaplar / izlenen yapımlar
create or replace function public.trending_media(p_kind public.media_kind, p_days integer default 7, p_limit integer default 10)
returns table (id uuid, title text, year smallint, cover_path text, activity_count integer, app_rating numeric)
language sql stable security invoker set search_path = '' as $$
  select m.id, m.title, m.year, m.cover_path, count(*)::integer, st.user_rating_avg
  from public.activities a
  join public.media_items m on m.id = a.media_id and m.kind = p_kind and m.moderation_status = 'visible'
  left join public.media_stats st on st.media_id = m.id
  where a.created_at > now() - make_interval(days => p_days)
    and a.verb in ('started_reading', 'finished_book', 'watched_movie', 'watching_series', 'finished_series', 'quoted', 'reviewed')
  group by m.id, st.user_rating_avg
  order by count(*) desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50)
$$;

create or replace function public.top_reviews(p_days integer default 7, p_limit integer default 10)
returns setof public.reviews
language sql stable security invoker set search_path = '' as $$
  select r.* from public.reviews r
  where r.status = 'visible'
    and exists (select 1 from public.review_helpful_votes v where v.review_id = r.id and v.created_at > now() - make_interval(days => p_days))
  order by (select count(*) from public.review_helpful_votes v where v.review_id = r.id and v.created_at > now() - make_interval(days => p_days)) desc,
           r.helpful_count desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50)
$$;

create or replace function public.top_quotes(p_days integer default 7, p_limit integer default 10)
returns setof public.quotes
language sql stable security invoker set search_path = '' as $$
  select q.* from public.quotes q
  where q.status = 'visible'
  order by (
    (select count(*) from public.likes l where l.target_type = 'quote' and l.target_id = q.id and l.created_at > now() - make_interval(days => p_days)) +
    2 * (select count(*) from public.saves s where s.target_type = 'quote' and s.target_id = q.id and s.created_at > now() - make_interval(days => p_days))
  ) desc, q.like_count desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50)
$$;

-- Zevk uyumu: en az 3 ortak puanlı eserde puan farkından türetilir (0–100).
create or replace function public.similar_users(p_limit integer default 10)
returns table (id uuid, username text, display_name text, avatar_path text, match integer, common_count integer, is_following boolean)
language sql stable security invoker set search_path = '' as $$
  with mine as (
    select media_id, rating from public.library_entries where user_id = auth.uid() and rating is not null
  ), pairs as (
    select le.user_id, count(*) as common, avg(abs(le.rating - mine.rating)) as diff
    from public.library_entries le join mine on mine.media_id = le.media_id
    where le.user_id <> auth.uid() and le.rating is not null
    group by le.user_id
    having count(*) >= 3
  )
  select p.id, p.username::text, p.display_name, p.avatar_path,
    greatest(0, round(100 - pairs.diff * 11.1))::integer,
    pairs.common::integer,
    exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = p.id)
  from pairs join public.profiles p on p.id = pairs.user_id
  where p.username is not null and p.deleted_at is null
  order by 5 desc, pairs.common desc
  limit least(greatest(coalesce(p_limit, 10), 1), 30)
$$;

-- Sana özel: benzer kullanıcıların 8+ verdiği, senin kütüphanende olmayan eserler.
create or replace function public.recommendations(p_kind public.media_kind, p_limit integer default 12)
returns table (id uuid, title text, year smallint, cover_path text, match integer, reason text)
language sql stable security invoker set search_path = '' as $$
  with peers as (
    select s.id, s.match from public.similar_users(30) s where s.match >= 60
  ), cand as (
    select le.media_id, max(peers.match) as best, count(*) as votes
    from public.library_entries le join peers on peers.id = le.user_id
    where le.rating >= 8
      and not exists (select 1 from public.library_entries mine where mine.user_id = auth.uid() and mine.media_id = le.media_id)
    group by le.media_id
  ), fallback as (
    select st.media_id, 0 as best, 0 as votes from public.media_stats st
    where st.user_rating_count >= 5
      and not exists (select 1 from public.library_entries mine where mine.user_id = auth.uid() and mine.media_id = st.media_id)
    order by st.user_rating_avg desc nulls last limit 50
  )
  select m.id, m.title, m.year, m.cover_path,
    case when c.votes > 0 then least(99, c.best + (c.votes::integer - 1) * 2)::integer else null end,
    case when c.votes > 0 then 'Zevkine benzeyen ' || c.votes || ' kişi 8+ verdi' else 'BOOKFLIX''te yüksek puanlı' end
  from (select * from cand union all select * from fallback where not exists (select 1 from cand)) c
  join public.media_items m on m.id = c.media_id and m.kind = p_kind and m.moderation_status = 'visible'
  order by c.votes desc, c.best desc
  limit least(greatest(coalesce(p_limit, 12), 1), 50)
$$;

-- ---------------------------------------------------------------- profil ve hesap
create or replace function public.complete_onboarding(
  p_username text, p_display_name text, p_bio text,
  p_kvkk_version text, p_analytics boolean, p_marketing boolean
) returns public.profiles
language plpgsql security invoker set search_path = '' as $$
declare
  result public.profiles;
begin
  update public.profiles set username = p_username, display_name = nullif(btrim(p_display_name), ''),
    bio = nullif(btrim(p_bio), ''), onboarded_at = coalesce(onboarded_at, now())
  where id = auth.uid()
  returning * into result;
  insert into public.consents (user_id, consent_type, version, granted) values
    (auth.uid(), 'kvkk_notice', p_kvkk_version, true),
    (auth.uid(), 'terms', p_kvkk_version, true),
    (auth.uid(), 'analytics', p_kvkk_version, coalesce(p_analytics, false)),
    (auth.uid(), 'marketing', p_kvkk_version, coalesce(p_marketing, false));
  return result;
end
$$;

create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_username ~ '^[a-zA-Z0-9_.]{3,24}$'
     and not exists (select 1 from public.profiles where username = p_username::extensions.citext and id <> auth.uid())
$$;

-- Hesap anında devre dışı kalır, içerik gizlenir; kalıcı silme 30 gün içinde purge ile yapılır.
create or replace function public.request_account_deletion() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  purge timestamptz;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.profiles set deleted_at = now() where id = uid;
  delete from public.push_tokens where user_id = uid;
  delete from public.follows where follower_id = uid or followee_id = uid;
  insert into public.deletion_requests (user_id) values (uid)
  on conflict (user_id) do update set requested_at = now()
  returning purge_after into purge;
  return purge;
end
$$;

-- Servis rolüyle (cron veya Edge Function) çağrılır.
create or replace function public.purge_deleted_accounts() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n integer := 0;
begin
  for r in select user_id from public.deletion_requests where completed_at is null and purge_after <= now() loop
    delete from auth.users where id = r.user_id;
    update public.deletion_requests set completed_at = now() where user_id = r.user_id;
    n := n + 1;
  end loop;
  return n;
end
$$;
revoke execute on function public.purge_deleted_accounts() from public, anon, authenticated;

-- Haftalık skor (keşfet sıralaması) — günlük cron
create or replace function public.refresh_weekly_scores() returns void
language sql security definer set search_path = '' as $$
  update public.media_stats st set weekly_score = coalesce(x.score, 0), updated_at = now()
  from public.media_stats st2
  left join (
    select media_id, count(*) * 1.0 as score from public.activities
    where created_at > now() - interval '7 days' and media_id is not null group by media_id
  ) x on x.media_id = st2.media_id
  where st.media_id = st2.media_id
$$;
revoke execute on function public.refresh_weekly_scores() from public, anon, authenticated;

-- Profil özeti: istatistik ve rozetler tek çağrıda
create or replace function public.profile_summary(p_user uuid)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  select case when not public.can_view_user(p_user) then
    jsonb_build_object('restricted', true,
      'profile', (select jsonb_build_object('id', id, 'username', username, 'display_name', display_name, 'avatar_path', avatar_path,
                                            'is_private', is_private, 'follower_count', follower_count, 'following_count', following_count)
                  from public.profiles where id = p_user))
  else jsonb_build_object(
    'restricted', false,
    'profile', (select to_jsonb(p) from public.profiles p where p.id = p_user),
    'level', (select jsonb_build_object(
        'current_min', (select min_xp from public.levels where level = p.level),
        'next_min', (select min_xp from public.levels where level = p.level + 1))
      from public.profiles p where p.id = p_user),
    'xp_today', (select coalesce(sum(xp), 0) from public.xp_ledger where user_id = p_user and day = public.istanbul_today() and reversed_at is null),
    'badges', (select coalesce(jsonb_agg(jsonb_build_object('code', b.code, 'name', b.name, 'icon', b.icon, 'tiers', b.tiers,
                 'tier', coalesce(ub.tier, 0), 'progress', coalesce(ub.progress, 0), 'awarded_at', ub.awarded_at) order by b.sort_order), '[]'::jsonb)
               from public.badges b left join public.user_badges ub on ub.badge_id = b.id and ub.user_id = p_user),
    'stats', jsonb_build_object(
      'books_completed', (select count(*) from public.library_entries l join public.media_items m on m.id = l.media_id
                          where l.user_id = p_user and l.status = 'completed' and m.kind = 'book'),
      'pages_read', (select coalesce(sum(b.page_count), 0) from public.library_entries l join public.book_details b on b.media_id = l.media_id
                     where l.user_id = p_user and l.status = 'completed'),
      'movies_watched', (select count(*) from public.library_entries l join public.media_items m on m.id = l.media_id
                         where l.user_id = p_user and l.status = 'completed' and m.kind = 'movie'),
      'episodes_watched', (select count(*) from public.episode_progress where user_id = p_user)
    ),
    'is_following', exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = p_user and f.status = 'accepted'),
    'follow_pending', exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = p_user and f.status = 'pending')
  ) end
$$;
