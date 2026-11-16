-- Oturum bitince kaldığın sayfa, oturumdaki son sayfa olur (geri alınan sayfalar da korunur).
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
    current_page = coalesce(excluded.current_page, public.library_entries.current_page);

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
