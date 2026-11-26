-- Profil özeti, hedef halkaları ve seri dondurucu.
--   * page_log: her gün ilerletilen sayfa (kaldığın sayfa arttıkça kitaplık tetikleyicisi yazar)
--   * user_settings: günlük dakika ve haftalık sayfa hedefi (varsayılan 30 dk, 150 sayfa)
--   * reading_today(): bugünkü dakika, bu haftaki sayfa, bu yılki kitap, hedefler ve okunan kitap
--   * seri dondurucu: ayda 2 hak; dün okunmadıysa ve önceki gün okunduysa dünü "dondurulmuş" sayar

alter table public.user_settings add column if not exists daily_goal_minutes integer not null default 30 check (daily_goal_minutes between 5 and 600);
alter table public.user_settings add column if not exists weekly_goal_pages integer not null default 150 check (weekly_goal_pages between 10 and 5000);

create table if not exists public.page_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  pages integer not null default 0 check (pages >= 0),
  primary key (user_id, day)
);
alter table public.page_log enable row level security;
drop policy if exists page_log_select on public.page_log;
create policy page_log_select on public.page_log for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.page_log from anon, authenticated;

-- Kitaplık tetikleyicisi: okunan günü işaretler ve ilerletilen sayfayı günlük toplama ekler
create or replace function public.reading_days_from_library() returns trigger
language plpgsql security definer set search_path = '' as $$
declare delta integer := 0;
begin
  if (select kind from public.media_items where id = new.media_id) <> 'book' then return null; end if;
  if tg_op = 'INSERT' then
    if coalesce(new.current_page, 0) > 0 or new.status = 'completed' then
      perform public.mark_reading_day(new.user_id, public.istanbul_today(), 'library');
    end if;
  else
    delta := coalesce(new.current_page, 0) - coalesce(old.current_page, 0);
    if delta > 0
       or (new.status = 'completed' and old.status is distinct from 'completed')
       or (new.status = 'in_progress' and old.status is distinct from 'in_progress') then
      perform public.mark_reading_day(new.user_id, public.istanbul_today(), 'library');
    end if;
    if delta > 0 and delta <= 600 then  -- yanlışlıkla girilen dev sayılar hedefi şişirmesin
      insert into public.page_log (user_id, day, pages) values (new.user_id, public.istanbul_today(), delta)
      on conflict (user_id, day) do update set pages = public.page_log.pages + excluded.pages;
    end if;
  end if;
  return null;
end $$;

-- Geçmiş oturumlardan sayfa günlüğünü doldur
insert into public.page_log (user_id, day, pages)
select user_id, day, sum(greatest(coalesce(end_page, 0) - coalesce(start_page, 0), 0))::integer
from public.reading_sessions where end_page is not null and start_page is not null
group by user_id, day having sum(greatest(coalesce(end_page, 0) - coalesce(start_page, 0), 0)) between 1 and 2000
on conflict (user_id, day) do nothing;

-- Seri dondurucu kullanımı
create table if not exists public.streak_freezes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  used_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.streak_freezes enable row level security;
drop policy if exists streak_freezes_select on public.streak_freezes;
create policy streak_freezes_select on public.streak_freezes for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.streak_freezes from anon, authenticated;

create or replace function public.freeze_state(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with t as (select public.istanbul_today() as d)
  select jsonb_build_object(
    'remaining', greatest(0, 2 - (select count(*) from public.streak_freezes f, t
                                  where f.user_id = p_user and date_trunc('month', f.day) = date_trunc('month', t.d - 1))::integer),
    'missed_day', (select t.d - 1 from t),
    'can_use', (select not exists (select 1 from public.reading_days r where r.user_id = p_user and r.day = t.d - 1)
                   and exists (select 1 from public.reading_days r where r.user_id = p_user and r.day = t.d - 2) from t)
  )
$$;
revoke execute on function public.freeze_state(uuid) from public, anon, authenticated;

create or replace function public.use_streak_freeze() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  st jsonb;
  missed date;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  st := public.freeze_state(uid);
  if not (st ->> 'can_use')::boolean then raise exception 'freeze_not_needed' using errcode = 'P0001'; end if;
  if (st ->> 'remaining')::integer < 1 then raise exception 'no_freezes_left' using errcode = 'P0001'; end if;
  missed := (st ->> 'missed_day')::date;
  insert into public.streak_freezes (user_id, day) values (uid, missed) on conflict do nothing;
  perform public.mark_reading_day(uid, missed, 'freeze');
  return jsonb_build_object('streak', public.reading_streak(uid), 'freeze', public.freeze_state(uid));
end
$$;
revoke execute on function public.use_streak_freeze() from public, anon;
grant execute on function public.use_streak_freeze() to authenticated;

-- Profil özeti: yalnızca kişinin kendisi için
create or replace function public.reading_today() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := public.istanbul_today();
  wk date := date_trunc('week', public.istanbul_today())::date; -- pazartesi
  s public.user_settings;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into s from public.user_settings where user_id = uid;
  return jsonb_build_object(
    'today_minutes', coalesce((select sum(seconds) from public.reading_sessions where user_id = uid and day = today), 0) / 60,
    'week_pages', coalesce((select sum(pages) from public.page_log where user_id = uid and day >= wk), 0),
    'year_books', (select count(*) from public.library_entries l join public.media_items m on m.id = l.media_id and m.kind = 'book'
                   where l.user_id = uid and l.status = 'completed' and extract(year from coalesce(l.finished_at, l.updated_at)) = extract(year from today)),
    'goal_minutes', coalesce(s.daily_goal_minutes, 30),
    'goal_pages', coalesce(s.weekly_goal_pages, 150),
    'goal_books', (select target from public.reading_goals where user_id = uid and year = extract(year from today)),
    'streak', public.reading_streak(uid),
    'freeze', public.freeze_state(uid),
    'current', (select jsonb_build_object('media_id', m.id, 'title', m.title, 'cover_path', m.cover_path, 'current_page', l.current_page, 'page_count', b.page_count)
                from public.library_entries l join public.media_items m on m.id = l.media_id and m.kind = 'book'
                left join public.book_details b on b.media_id = m.id
                where l.user_id = uid and l.status = 'in_progress' order by l.updated_at desc limit 1)
  );
end
$$;
revoke execute on function public.reading_today() from public, anon;
grant execute on function public.reading_today() to authenticated;
