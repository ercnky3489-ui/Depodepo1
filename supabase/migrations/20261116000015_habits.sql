-- Alışkanlık ve keşif: ISBN taramaları (yeni kitap ekleyene XP), okuma oturumları,
-- günlük okuma serisi (streak) ve kilometre taşı ödülleri, yıl özeti (Wrapped).

insert into public.xp_rules (action, xp, cap_group, daily_count_cap, daily_xp_cap, min_chars) values
  ('isbn_added',      15, 'isbn',    10,   null, 0),
  ('reading_session',  5, 'session',  3,   null, 0),
  ('streak_bonus',    25, 'streak',  null, null, 0)
on conflict (action) do update set xp = excluded.xp, cap_group = excluded.cap_group,
  daily_count_cap = excluded.daily_count_cap, daily_xp_cap = excluded.daily_xp_cap;

-- ---------------------------------------------------------------- ISBN taramaları
create table if not exists public.isbn_scans (
  user_id uuid not null references public.profiles (id) on delete cascade,
  media_id uuid not null references public.media_items (id) on delete cascade,
  isbn13 text check (isbn13 ~ '^[0-9]{13}$'),
  added_new boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, media_id)
);
create index if not exists isbn_scans_user_idx on public.isbn_scans (user_id, created_at desc);
alter table public.isbn_scans enable row level security;
create policy isbn_scans_select on public.isbn_scans for select to authenticated
  using (user_id = auth.uid() or public.can_view_user(user_id));
revoke insert, update, delete on public.isbn_scans from authenticated;

-- Taranan kitabı kaydeder. Kitap kataloğa bu tarama ile yeni girdiyse (son 15 dk içinde eklendi ve
-- başka kimse taramadı) ya da kullanıcı kitabı kendisi eklediyse 'isbn_added' XP'si verilir.
create or replace function public.record_isbn_scan(p_media_id uuid, p_isbn text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  m record;
  fresh boolean;
  gained integer := 0;
  code text := nullif(regexp_replace(coalesce(p_isbn, ''), '\D', '', 'g'), '');
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select id, kind, created_at, created_by into m from public.media_items where id = p_media_id;
  if not found or m.kind <> 'book' then raise exception 'target_not_found' using errcode = 'P0001'; end if;
  if code is not null and code !~ '^[0-9]{13}$' then code := null; end if;
  fresh := coalesce(m.created_by = uid, false)
    or (m.created_at > now() - interval '15 minutes'
        and not exists (select 1 from public.isbn_scans s where s.media_id = p_media_id and s.user_id <> uid));
  insert into public.isbn_scans (user_id, media_id, isbn13, added_new) values (uid, p_media_id, code, fresh)
  on conflict (user_id, media_id) do nothing;
  if fresh then gained := coalesce(public.award_xp(uid, 'isbn_added', 'media', p_media_id), 0); end if;
  return jsonb_build_object('added_new', fresh, 'xp', gained);
end
$$;
revoke execute on function public.record_isbn_scan(uuid, text) from public, anon;
grant execute on function public.record_isbn_scan(uuid, text) to authenticated;

-- ---------------------------------------------------------------- okuma oturumları ve seri
create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  media_id uuid not null references public.media_items (id) on delete cascade,
  seconds integer not null check (seconds between 1 and 28800),
  start_page integer check (start_page >= 0),
  end_page integer check (end_page >= 0),
  day date not null default public.istanbul_today(),
  created_at timestamptz not null default now()
);
create index if not exists reading_sessions_user_day_idx on public.reading_sessions (user_id, day desc);
alter table public.reading_sessions enable row level security;
create policy reading_sessions_select on public.reading_sessions for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.reading_sessions from authenticated;

-- Seri: en az 1 dakikalık oturum olan ardışık günler (İstanbul saati). Bugün ya da dün biten seri sürer.
create or replace function public.reading_streak(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with days as (
    select distinct day from public.reading_sessions where user_id = p_user and seconds >= 60
  ), g as (
    select day, day - (row_number() over (order by day))::integer as grp from days
  ), runs as (
    select min(day) as s, max(day) as e, count(*)::integer as n from g group by grp
  ), cur as (
    select s, n from runs where e >= public.istanbul_today() - 1 order by e desc limit 1
  )
  select case when not public.can_view_user(p_user) then null else jsonb_build_object(
    'current', coalesce((select n from cur), 0),
    'start', (select s from cur),
    'best', coalesce((select max(n) from runs), 0),
    'today', exists (select 1 from days where day = public.istanbul_today())
  ) end
$$;
revoke execute on function public.reading_streak(uuid) from public, anon;
grant execute on function public.reading_streak(uuid) to authenticated;

-- Oturumu kaydeder, kütüphanedeki sayfayı ilerletir, 10 dk+ oturuma XP verir, seri kilometre taşında ödül verir.
create or replace function public.finish_reading_session(p_media_id uuid, p_seconds integer, p_start_page integer, p_end_page integer)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  gained integer := 0;
  bonus integer := 0;
  st jsonb;
  cur integer;
  page integer := nullif(p_end_page, 0);
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_seconds is null or p_seconds < 1 then raise exception 'invalid_payload' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.media_items where id = p_media_id) then raise exception 'target_not_found' using errcode = 'P0001'; end if;

  insert into public.reading_sessions (user_id, media_id, seconds, start_page, end_page)
  values (uid, p_media_id, least(p_seconds, 28800), p_start_page, p_end_page) returning id into sid;

  insert into public.library_entries (user_id, media_id, status, started_at, current_page)
  values (uid, p_media_id, 'in_progress', now(), page)
  on conflict (user_id, media_id) do update set
    status = case when public.library_entries.status = 'planned' then 'in_progress'::public.library_status else public.library_entries.status end,
    started_at = coalesce(public.library_entries.started_at, now()),
    current_page = greatest(coalesce(public.library_entries.current_page, 0), coalesce(excluded.current_page, 0));

  if p_seconds >= 600 then
    gained := coalesce(public.award_xp(uid, 'reading_session', 'reading_session', sid), 0);
  end if;

  st := public.reading_streak(uid);
  cur := coalesce((st ->> 'current')::integer, 0);
  if cur = any (array[3, 7, 14, 30, 60, 100, 365]) then
    bonus := coalesce(public.award_xp(uid, 'streak_bonus', 'streak',
      md5(uid::text || ':streak:' || cur || ':' || coalesce(st ->> 'start', ''))::uuid), 0);
  end if;

  return jsonb_build_object('session_id', sid, 'xp', gained, 'bonus_xp', bonus, 'streak', cur,
    'best', coalesce((st ->> 'best')::integer, 0), 'milestone', bonus > 0);
end
$$;
revoke execute on function public.finish_reading_session(uuid, integer, integer, integer) from public, anon;
grant execute on function public.finish_reading_session(uuid, integer, integer, integer) to authenticated;

-- ---------------------------------------------------------------- yıl özeti (Wrapped)
create or replace function public.my_wrapped(p_year integer) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with me as (select auth.uid() as uid),
  done as (
    select l.media_id, l.rating, coalesce(l.finished_at, l.updated_at) as at, m.title, m.cover_path, b.page_count
    from public.library_entries l join public.media_items m on m.id = l.media_id
    left join public.book_details b on b.media_id = l.media_id, me
    where l.user_id = me.uid and l.status = 'completed' and m.kind = 'book'
      and extract(year from coalesce(l.finished_at, l.updated_at)) = p_year
  ),
  sess as (
    select s.* from public.reading_sessions s, me where s.user_id = me.uid and extract(year from s.day) = p_year
  ),
  days as (select distinct day from sess where seconds >= 60),
  runs as (select count(*)::integer as n from (select day - (row_number() over (order by day))::integer as grp from days) x group by grp),
  authors as (
    select c.name, count(*)::integer as n from done d
    join public.media_contributors mc on mc.media_id = d.media_id and mc.role = 'author'
    join public.contributors c on c.id = mc.contributor_id group by c.name order by n desc, c.name limit 1
  ),
  months as (select extract(month from at)::integer as m, count(*)::integer as n from done group by 1 order by n desc, m limit 1)
  select jsonb_build_object(
    'year', p_year,
    'books', (select count(*) from done),
    'pages', (select coalesce(sum(page_count), 0) from done),
    'minutes', (select coalesce(sum(seconds), 0) / 60 from sess),
    'sessions', (select count(*) from sess),
    'reading_days', (select count(*) from days),
    'best_streak', coalesce((select max(n) from runs), 0),
    'top_author', (select jsonb_build_object('name', name, 'books', n) from authors),
    'top_month', (select m from months),
    'quotes', (select count(*) from public.quotes q, me where q.user_id = me.uid and extract(year from q.created_at) = p_year),
    'reviews', (select count(*) from public.reviews r, me where r.user_id = me.uid and extract(year from r.created_at) = p_year),
    'top_rated', (select jsonb_build_object('id', media_id, 'title', title, 'cover_path', cover_path, 'rating', rating)
                  from done where rating is not null order by rating desc, at limit 1),
    'first', (select jsonb_build_object('id', media_id, 'title', title, 'cover_path', cover_path) from done order by at limit 1),
    'covers', (select coalesce(jsonb_agg(jsonb_build_object('id', media_id, 'title', title, 'cover_path', cover_path) order by at), '[]'::jsonb)
               from (select * from done order by at limit 12) x),
    'xp', (select coalesce(sum(xp), 0) from public.xp_ledger l, me where l.user_id = me.uid and extract(year from l.day) = p_year and l.reversed_at is null)
  )
$$;
revoke execute on function public.my_wrapped(integer) from public, anon;
grant execute on function public.my_wrapped(integer) to authenticated;
