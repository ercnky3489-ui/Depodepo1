-- BOOKFLIX · 0003 · XP motoru, seviyeler ve rozetler
-- XP yalnızca burada, sunucuda yazılır. İstemcinin xp_ledger'a yazma yetkisi yoktur.

-- ---------------------------------------------------------------- kalite kontrolü
-- Neden-kodu döndürür; null = kalite şartı sağlandı.
create or replace function public.content_quality_issue(
  p_user uuid, p_body text, p_min integer, p_table text, p_id uuid
) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  h text := md5(public.normalize_text(p_body));
  norm text := public.normalize_text(p_body);
  thr real;
begin
  if public.effective_length(p_body) < p_min then
    return 'too_short';
  end if;
  if public.is_repetitive(p_body) then
    return 'repetitive';
  end if;
  if exists (select 1 from public.quotes where user_id = p_user and body_hash = h and not (p_table = 'quotes' and id = p_id))
     or exists (select 1 from public.reviews where user_id = p_user and body_hash = h and not (p_table = 'reviews' and id = p_id)) then
    return 'duplicate';
  end if;
  select similarity_threshold into thr from public.xp_settings;
  if exists (
    select 1 from (
      (select id, body, 'quotes' as t from public.quotes where user_id = p_user order by created_at desc limit 50)
      union all
      (select id, body, 'reviews' as t from public.reviews where user_id = p_user order by created_at desc limit 50)
    ) recent
    where not (recent.t = p_table and recent.id = p_id)
      and extensions.similarity(public.normalize_text(recent.body), norm) > coalesce(thr, 0.8)
  ) then
    return 'too_similar';
  end if;
  return null;
end
$$;

-- ---------------------------------------------------------------- XP yazma ve geri alma
create or replace function public.award_xp(
  p_user uuid, p_action public.xp_action, p_source_type text, p_source_id uuid, p_withheld text default null
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r public.xp_rules;
  s public.xp_settings;
  today date := public.istanbul_today();
  amount integer;
  reason text := p_withheld;
  n_group integer;
  xp_group integer;
  xp_total integer;
begin
  select * into r from public.xp_rules where action = p_action;
  if not found or not r.active then
    return 0;
  end if;
  if exists (select 1 from public.xp_ledger where user_id = p_user and action = p_action and source_id = p_source_id) then
    return 0;
  end if;
  select * into s from public.xp_settings;
  amount := r.xp;

  if reason is null then
    select count(*), coalesce(sum(l.xp), 0) into n_group, xp_group
    from public.xp_ledger l join public.xp_rules rr on rr.action = l.action
    where l.user_id = p_user and l.day = today and l.reversed_at is null and l.xp > 0 and rr.cap_group = r.cap_group;

    if r.daily_count_cap is not null and n_group >= r.daily_count_cap then
      reason := 'daily_count_cap';
    elsif r.daily_xp_cap is not null and xp_group + amount > r.daily_xp_cap then
      amount := greatest(r.daily_xp_cap - xp_group, 0);
      if amount = 0 then reason := 'daily_xp_cap'; end if;
    end if;
  end if;

  if reason is null then
    select coalesce(sum(xp), 0) into xp_total from public.xp_ledger
    where user_id = p_user and day = today and reversed_at is null;
    if xp_total + amount > coalesce(s.daily_total_cap, 300) then
      amount := greatest(coalesce(s.daily_total_cap, 300) - xp_total, 0);
      if amount = 0 then reason := 'daily_total_cap'; end if;
    end if;
  end if;

  if reason is not null then
    amount := 0;
  end if;

  insert into public.xp_ledger (user_id, action, source_type, source_id, xp, withheld_reason)
  values (p_user, p_action, p_source_type, p_source_id, amount, reason)
  on conflict (user_id, action, source_id) do nothing;
  return amount;
end
$$;

create or replace function public.reverse_xp(p_user uuid, p_action public.xp_action, p_source_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.xp_ledger set reversed_at = now()
  where user_id = p_user and action = p_action and source_id = p_source_id and reversed_at is null
$$;

create or replace function public.restore_xp(p_user uuid, p_action public.xp_action, p_source_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.xp_ledger set reversed_at = null
  where user_id = p_user and action = p_action and source_id = p_source_id and reversed_at is not null
$$;

-- Defter değişince profildeki toplam ve seviye güncellenir.
create or replace function public.tg_xp_ledger_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := coalesce(new.user_id, old.user_id);
  total integer;
  old_level integer;
  new_level integer;
begin
  select coalesce(sum(xp), 0) into total from public.xp_ledger where user_id = u and reversed_at is null;
  select level into old_level from public.profiles where id = u;
  select coalesce(max(level), 1) into new_level from public.levels where min_xp <= total;
  update public.profiles set total_xp = total, level = new_level where id = u;
  if new_level > coalesce(old_level, 1) then
    perform public.notify(u, null, 'level_up', 'profile', u, jsonb_build_object('level', new_level));
  end if;
  return coalesce(new, old);
end
$$;
create trigger xp_ledger_after after insert or update or delete on public.xp_ledger
for each row execute function public.tg_xp_ledger_after();

-- ---------------------------------------------------------------- rozetler
create or replace function public.badge_metric(p_user uuid, p_code text) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare
  v integer;
  movie_min integer;
begin
  case p_code
    when 'book_worm' then
      select count(*) into v from public.library_entries l join public.media_items m on m.id = l.media_id
      where l.user_id = p_user and l.status = 'completed' and m.kind = 'book';
    when 'long_reader' then
      select count(*) into v from public.library_entries l join public.book_details b on b.media_id = l.media_id
      where l.user_id = p_user and l.status = 'completed' and b.page_count > 500;
    when 'film_buff' then
      select count(*) into v from public.library_entries l join public.media_items m on m.id = l.media_id
      where l.user_id = p_user and l.status = 'completed' and m.kind = 'movie';
    when 'series_lover' then
      select count(*) into v from public.episode_progress where user_id = p_user;
    when 'quote_master' then
      select count(*) into v from public.quotes where user_id = p_user and status = 'visible' and like_count >= 3;
    when 'master_reviewer' then
      select count(*) into v from public.reviews where user_id = p_user and status = 'visible' and helpful_count >= 5;
    when 'film_critic' then
      select min_chars into movie_min from public.xp_rules where action = 'review_movie';
      select count(*) into v from public.reviews r join public.media_items m on m.id = r.media_id
      where r.user_id = p_user and r.status = 'visible' and r.episode_id is null and m.kind = 'movie'
        and public.effective_length(r.body) >= coalesce(movie_min, 300);
    else
      v := 0;
  end case;
  return coalesce(v, 0);
end
$$;

create or replace function public.refresh_badges(p_user uuid, p_codes text[] default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  b public.badges;
  val integer;
  t smallint;
  prev smallint;
begin
  -- Hesap silinirken (cascade) profil artık yoktur: rozet yazılmaz.
  if p_user is null or not exists (select 1 from public.profiles where id = p_user and deleted_at is null) then
    return;
  end if;
  for b in select * from public.badges where p_codes is null or code = any (p_codes) loop
    val := public.badge_metric(p_user, b.code);
    t := case when val >= b.tiers[3] then 3 when val >= b.tiers[2] then 2 when val >= b.tiers[1] then 1 else 0 end;
    select tier into prev from public.user_badges where user_id = p_user and badge_id = b.id;
    insert into public.user_badges (user_id, badge_id, tier, progress, awarded_at, updated_at)
    values (p_user, b.id, t, val, case when t > 0 then now() end, now())
    on conflict (user_id, badge_id) do update set
      progress = excluded.progress,
      tier = greatest(public.user_badges.tier, excluded.tier),
      awarded_at = case when excluded.tier > public.user_badges.tier then now() else public.user_badges.awarded_at end,
      updated_at = now();
    if t > coalesce(prev, 0) then
      perform public.notify(p_user, null, 'badge', 'badge', b.id, jsonb_build_object('code', b.code, 'tier', t));
    end if;
  end loop;
end
$$;

-- ---------------------------------------------------------------- XP tetikleyicileri
create or replace function public.tg_quotes_xp() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  k public.media_kind;
  act public.xp_action;
  mn integer;
  reason text;
begin
  select kind into k from public.media_items where id = coalesce(new.media_id, old.media_id);
  act := case when k = 'book' then 'quote_book'::public.xp_action else 'quote_screen'::public.xp_action end;

  if tg_op = 'DELETE' then
    perform public.reverse_xp(old.user_id, act, old.id);
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.status = 'removed' and old.status <> 'removed' then
      perform public.reverse_xp(new.user_id, act, new.id);
    elsif old.status = 'removed' and new.status = 'visible' then
      perform public.restore_xp(new.user_id, act, new.id);
    end if;
    return new;
  end if;

  select min_chars into mn from public.xp_rules where action = act;
  reason := public.content_quality_issue(new.user_id, new.body, coalesce(mn, 0), 'quotes', new.id);
  if reason is null and k = 'book' and not exists (
    select 1 from public.library_entries where user_id = new.user_id and media_id = new.media_id
  ) then
    reason := 'not_in_library';
  end if;
  if reason is null and k <> 'book' and coalesce(btrim(new.scene_note), '') = '' and new.episode_id is null then
    reason := 'no_scene_note';
  end if;
  perform public.award_xp(new.user_id, act, 'quote', new.id, reason);
  return new;
end
$$;
create trigger quotes_xp after insert or update of status or delete on public.quotes
for each row execute function public.tg_quotes_xp();

create or replace function public.review_action(p_media uuid, p_episode uuid) returns public.xp_action
language sql stable security definer set search_path = '' as $$
  select case
    when p_episode is not null then 'review_episode'::public.xp_action
    when (select kind from public.media_items where id = p_media) = 'book' then 'review_book'::public.xp_action
    else 'review_movie'::public.xp_action
  end
$$;

create or replace function public.tg_reviews_xp() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  act public.xp_action;
  mn integer;
  reason text;
  k public.media_kind;
  st public.library_status;
begin
  if tg_op = 'DELETE' then
    act := public.review_action(old.media_id, old.episode_id);
    perform public.reverse_xp(old.user_id, act, old.id);
    perform public.refresh_badges(old.user_id, array['film_critic', 'master_reviewer']);
    return old;
  end if;

  act := public.review_action(new.media_id, new.episode_id);
  select min_chars into mn from public.xp_rules where action = act;

  if tg_op = 'UPDATE' then
    if new.status = 'removed' and old.status <> 'removed' then
      perform public.reverse_xp(new.user_id, act, new.id);
    elsif old.status = 'removed' and new.status = 'visible' then
      perform public.restore_xp(new.user_id, act, new.id);
    elsif new.body is distinct from old.body and public.effective_length(new.body) < coalesce(mn, 0) then
      perform public.reverse_xp(new.user_id, act, new.id);
    end if;
    if new.episode_id is null and new.rating is distinct from old.rating then
      update public.library_entries set rating = new.rating where user_id = new.user_id and media_id = new.media_id;
    end if;
    perform public.refresh_badges(new.user_id, array['film_critic']);
    return new;
  end if;

  reason := public.content_quality_issue(new.user_id, new.body, coalesce(mn, 0), 'reviews', new.id);
  if reason is null then
    select kind into k from public.media_items where id = new.media_id;
    select status into st from public.library_entries where user_id = new.user_id and media_id = new.media_id;
    if act = 'review_episode' then
      if not exists (select 1 from public.episode_progress where user_id = new.user_id and episode_id = new.episode_id) then
        reason := 'episode_not_watched';
      end if;
    elsif act = 'review_book' then
      if st is null or st not in ('in_progress', 'completed') then reason := 'not_read'; end if;
    elsif k = 'movie' then
      if st is distinct from 'completed' then reason := 'not_watched'; end if;
    else
      if st is null or st not in ('in_progress', 'completed') then reason := 'not_watched'; end if;
    end if;
  end if;
  perform public.award_xp(new.user_id, act, 'review', new.id, reason);

  if new.episode_id is null then
    update public.library_entries set rating = new.rating where user_id = new.user_id and media_id = new.media_id;
  end if;
  perform public.refresh_badges(new.user_id, array['film_critic']);
  return new;
end
$$;
create trigger reviews_xp after insert or update of status, body, rating or delete on public.reviews
for each row execute function public.tg_reviews_xp();

create or replace function public.tg_helpful_xp() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  author uuid;
  src uuid;
  reason text;
  voter_created timestamptz;
  voter_confirmed timestamptz;
  n integer;
  s public.xp_settings;
  rid uuid := coalesce(new.review_id, old.review_id);
  vid uuid := coalesce(new.user_id, old.user_id);
begin
  select user_id into author from public.reviews where id = rid;
  src := md5(vid::text || ':' || rid::text)::uuid;
  if tg_op = 'DELETE' then
    perform public.reverse_xp(author, 'review_helpful', src);
    perform public.refresh_badges(author, array['master_reviewer']);
    return old;
  end if;
  select * into s from public.xp_settings;
  select p.created_at into voter_created from public.profiles p where p.id = vid;
  select u.email_confirmed_at into voter_confirmed from auth.users u where u.id = vid;
  select count(*) into n
  from public.review_helpful_votes v join public.reviews r on r.id = v.review_id
  where v.user_id = vid and r.user_id = author
    and (v.created_at at time zone 'Europe/Istanbul')::date = public.istanbul_today();
  if voter_created > now() - s.helpful_voter_min_age then
    reason := 'voter_too_new';
  elsif voter_confirmed is null then
    reason := 'voter_unverified';
  elsif n > s.helpful_per_voter_author_daily then
    reason := 'voter_author_daily_cap';
  end if;
  perform public.award_xp(author, 'review_helpful', 'helpful_vote', src, reason);
  perform public.refresh_badges(author, array['master_reviewer']);
  return new;
end
$$;
create trigger helpful_xp after insert or delete on public.review_helpful_votes
for each row execute function public.tg_helpful_xp();

create or replace function public.tg_likes_xp() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
  liker_created timestamptz;
  s public.xp_settings;
  reason text;
  r public.likes;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  owner := public.content_owner(r.target_type, r.target_id);
  if tg_op = 'DELETE' then
    if owner is not null then
      perform public.reverse_xp(owner, 'content_liked', old.id);
      if old.target_type = 'quote' then perform public.refresh_badges(owner, array['quote_master']); end if;
    end if;
    return old;
  end if;
  if owner is null or owner = new.user_id then
    return new;
  end if;
  select * into s from public.xp_settings;
  select created_at into liker_created from public.profiles where id = new.user_id;
  if liker_created > now() - s.like_giver_min_age then
    reason := 'liker_too_new';
  end if;
  perform public.award_xp(owner, 'content_liked', 'like', new.id, reason);
  if new.target_type = 'quote' then perform public.refresh_badges(owner, array['quote_master']); end if;
  return new;
end
$$;
create trigger likes_xp after insert or delete on public.likes
for each row execute function public.tg_likes_xp();

create or replace function public.tg_library_xp() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  k public.media_kind;
begin
  if tg_op = 'UPDATE' and old.status = new.status then
    return new;
  end if;
  select kind into k from public.media_items where id = new.media_id;
  if k = 'book' and new.status in ('in_progress', 'completed') then
    perform public.award_xp(new.user_id, 'start_reading', 'media', new.media_id);
  elsif k = 'movie' and new.status = 'completed' then
    perform public.award_xp(new.user_id, 'log_movie', 'media', new.media_id);
  end if;
  if new.status = 'completed' or (tg_op = 'UPDATE' and old.status = 'completed') then
    perform public.refresh_badges(new.user_id, array['book_worm', 'long_reader', 'film_buff']);
  end if;
  return new;
end
$$;
create trigger library_xp after insert or update of status on public.library_entries
for each row execute function public.tg_library_xp();

create or replace function public.tg_episode_progress_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := coalesce(new.user_id, old.user_id);
  ep uuid := coalesce(new.episode_id, old.episode_id);
  m uuid;
  total integer;
  watched integer;
begin
  select s.media_id into m from public.episodes e join public.seasons s on s.id = e.season_id where e.id = ep;
  if tg_op = 'INSERT' then
    -- İlk işaretlenen bölüm diziyi "İzliyorum"a alır; hepsi işaretlenince "İzledim".
    select count(*) into total from public.episodes e join public.seasons s on s.id = e.season_id where s.media_id = m;
    select count(*) into watched from public.episode_progress p join public.episodes e on e.id = p.episode_id
      join public.seasons s on s.id = e.season_id where s.media_id = m and p.user_id = u;
    insert into public.library_entries (user_id, media_id, status)
    values (u, m, case when watched >= total then 'completed'::public.library_status else 'in_progress'::public.library_status end)
    on conflict (user_id, media_id) do update set status = excluded.status
      where public.library_entries.status in ('planned', 'in_progress') and public.library_entries.status <> excluded.status;
  end if;
  perform public.refresh_badges(u, array['series_lover']);
  return coalesce(new, old);
end
$$;
create trigger episode_progress_after after insert or delete on public.episode_progress
for each row execute function public.tg_episode_progress_after();
