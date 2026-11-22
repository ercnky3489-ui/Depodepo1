-- Okuma serisi düzeltmesi: seri artık yalnızca "Oturumu bitir" ile kaydedilen oturumları değil,
-- o gün yapılan her gerçek okuma hareketini sayar:
--   * 1 dakika ve üstü okuma oturumu (bitirilmese bile: uygulama oturum sürerken günü işaretler)
--   * kaldığın sayfayı ilerletmek
--   * bir kitabı "okudum" yapmak ya da okumaya başlamak
--   * bir kitaptan alıntı paylaşmak
-- Her kullanıcı için okunan günler reading_days tablosunda tutulur; seri bu tablodan hesaplanır.

create table if not exists public.reading_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  source text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.reading_days enable row level security;
drop policy if exists reading_days_select on public.reading_days;
create policy reading_days_select on public.reading_days for select to authenticated
  using (user_id = auth.uid() or public.can_view_user(user_id));
revoke insert, update, delete on public.reading_days from anon, authenticated;

create or replace function public.mark_reading_day(p_user uuid, p_day date, p_source text) returns void
language sql security definer set search_path = '' as $$
  insert into public.reading_days (user_id, day, source) values (p_user, p_day, p_source) on conflict do nothing;
$$;
revoke execute on function public.mark_reading_day(uuid, date, text) from public, anon, authenticated;

-- Uygulama: okuma oturumu 1 dakikayı geçince bugünü işaretler (oturum bitirilmese de seri bozulmasın)
create or replace function public.mark_reading_today() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  perform public.mark_reading_day(uid, public.istanbul_today(), 'session_live');
  return public.reading_streak(uid);
end
$$;
revoke execute on function public.mark_reading_today() from public, anon;
grant execute on function public.mark_reading_today() to authenticated;

-- Tetikleyiciler
create or replace function public.reading_days_from_session() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.seconds >= 60 then perform public.mark_reading_day(new.user_id, new.day, 'session'); end if;
  return null;
end $$;
drop trigger if exists reading_days_session on public.reading_sessions;
create trigger reading_days_session after insert on public.reading_sessions for each row execute function public.reading_days_from_session();

create or replace function public.reading_days_from_library() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select kind from public.media_items where id = new.media_id) <> 'book' then return null; end if;
  if tg_op = 'INSERT' then
    if coalesce(new.current_page, 0) > 0 or new.status = 'completed' then
      perform public.mark_reading_day(new.user_id, public.istanbul_today(), 'library');
    end if;
  elsif coalesce(new.current_page, 0) > coalesce(old.current_page, 0)
     or (new.status = 'completed' and old.status is distinct from 'completed')
     or (new.status = 'in_progress' and old.status is distinct from 'in_progress') then
    perform public.mark_reading_day(new.user_id, public.istanbul_today(), 'library');
  end if;
  return null;
end $$;
drop trigger if exists reading_days_library on public.library_entries;
create trigger reading_days_library after insert or update on public.library_entries for each row execute function public.reading_days_from_library();

create or replace function public.reading_days_from_quote() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.mark_reading_day(new.user_id, public.istanbul_today(), 'quote');
  return null;
end $$;
drop trigger if exists reading_days_quote on public.quotes;
create trigger reading_days_quote after insert on public.quotes for each row execute function public.reading_days_from_quote();

-- Geçmişi doldur: eski oturumlar, alıntılar ve kitap akış kayıtları (demo hesaplar hariç)
insert into public.reading_days (user_id, day, source)
select user_id, day, 'session' from public.reading_sessions where seconds >= 60
on conflict do nothing;
insert into public.reading_days (user_id, day, source)
select q.user_id, (q.created_at at time zone 'Europe/Istanbul')::date, 'quote'
from public.quotes q join public.media_items m on m.id = q.media_id and m.kind = 'book'
where not exists (select 1 from auth.users u where u.id = q.user_id and u.raw_app_meta_data->>'demo' = 'true')
on conflict do nothing;
insert into public.reading_days (user_id, day, source)
select a.actor_id, (a.created_at at time zone 'Europe/Istanbul')::date, 'library'
from public.activities a
where a.verb in ('started_reading', 'finished_book')
  and not exists (select 1 from auth.users u where u.id = a.actor_id and u.raw_app_meta_data->>'demo' = 'true')
on conflict do nothing;
insert into public.reading_days (user_id, day, source)
select l.user_id, (l.updated_at at time zone 'Europe/Istanbul')::date, 'library'
from public.library_entries l join public.media_items m on m.id = l.media_id and m.kind = 'book'
where coalesce(l.current_page, 0) > 0
  and not exists (select 1 from auth.users u where u.id = l.user_id and u.raw_app_meta_data->>'demo' = 'true')
on conflict do nothing;

-- Seri artık okunan günlerden hesaplanır
create or replace function public.reading_streak(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with days as (
    select day from public.reading_days where user_id = p_user
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

create or replace function public.send_streak_reminders(p_slot text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  today date := public.istanbul_today();
  n integer := 0;
begin
  if p_slot not in ('noon', 'evening') then raise exception 'invalid_slot' using errcode = 'P0001'; end if;
  with days as (
    select user_id, day from public.reading_days where day >= today - 400
  ), g as (
    select user_id, day, day - (row_number() over (partition by user_id order by day))::integer as grp from days
  ), runs as (
    select user_id, max(day) as e, count(*)::integer as len from g group by user_id, grp
  ), alive as (
    select user_id, len from runs where e = today - 1
  ), ins as (
    insert into public.notifications (recipient_id, actor_id, type, target_type, target_id, data)
    select a.user_id, null, 'streak_reminder', null, null,
           jsonb_build_object('streak', a.len, 'slot', p_slot) || public.streak_message(p_slot, a.len)
    from alive a
    join public.user_settings s on s.user_id = a.user_id and s.notify_streak
    where not exists (
      select 1 from public.notifications x
      where x.recipient_id = a.user_id and x.type = 'streak_reminder' and x.data->>'slot' = p_slot
        and x.created_at >= (today::timestamp at time zone 'Europe/Istanbul')
    )
    returning 1
  )
  select count(*) into n from ins;
  return n;
end
$$;
revoke execute on function public.send_streak_reminders(text) from public, anon, authenticated;
