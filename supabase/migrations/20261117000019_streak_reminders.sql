-- Okuma serisi hatırlatmaları: serisi süren ama bugün henüz okumamış kullanıcılara günde en çok iki bildirim.
--   öğlen  (13:17 İstanbul): nazik hatırlatma
--   akşam  (20:47 İstanbul): "serin bitmek üzere"
-- Bildirim satırı uygulamada canlı kart + kitap sesi olarak, push açıksa telefonda da görünür.
-- Kullanıcı Ayarlar > Bildirimler'den kapatabilir (notify_streak).

alter table public.user_settings add column if not exists notify_streak boolean not null default true;

create or replace function public.send_streak_reminders(p_slot text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  today date := public.istanbul_today();
  n integer := 0;
begin
  if p_slot not in ('noon', 'evening') then raise exception 'invalid_slot' using errcode = 'P0001'; end if;
  with days as (
    select distinct user_id, day from public.reading_sessions where seconds >= 60 and day >= today - 400
  ), g as (
    select user_id, day, day - (row_number() over (partition by user_id order by day))::integer as grp from days
  ), runs as (
    select user_id, max(day) as e, count(*)::integer as len from g group by user_id, grp
  ), alive as (
    -- seri dün bitmiş (bugün henüz okunmamış) olanlar
    select user_id, len from runs where e = today - 1
  ), ins as (
    insert into public.notifications (recipient_id, actor_id, type, target_type, target_id, data)
    select a.user_id, null, 'streak_reminder', null, null, jsonb_build_object('streak', a.len, 'slot', p_slot)
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

do $$
begin
  if exists (select 1 from cron.job where jobname = 'streak-reminder-noon') then perform cron.unschedule('streak-reminder-noon'); end if;
  if exists (select 1 from cron.job where jobname = 'streak-reminder-evening') then perform cron.unschedule('streak-reminder-evening'); end if;
  -- pg_cron UTC çalışır: 10:17 UTC = 13:17 İstanbul, 17:47 UTC = 20:47 İstanbul
  perform cron.schedule('streak-reminder-noon', '17 10 * * *', $c$select public.send_streak_reminders('noon')$c$);
  perform cron.schedule('streak-reminder-evening', '47 17 * * *', $c$select public.send_streak_reminders('evening')$c$);
end $$;
