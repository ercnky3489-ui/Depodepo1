-- BOOKFLIX · 0002 · Yardımcı fonksiyonlar ve tetikleyiciler
-- Sayaçlar, akış aktiviteleri, bildirimler ve tutarlılık kuralları veritabanında tutulur;
-- istemci sayaç veya aktivite yazmaz.

-- ---------------------------------------------------------------- metin yardımcıları
create or replace function public.f_unaccent(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, ''))
$$;

create or replace function public.normalize_text(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select btrim(lower(public.f_unaccent(regexp_replace(coalesce(t, ''), '\s+', ' ', 'g'))))
$$;

-- Boşluk saymaz, art arda tekrar eden karakteri tek sayar ("çooook" -> "çok").
create or replace function public.effective_length(t text) returns integer
language sql immutable parallel safe set search_path = '' as $$
  select char_length(regexp_replace(regexp_replace(coalesce(t, ''), '(.)\1+', '\1', 'g'), '\s', '', 'g'))
$$;

-- Metnin yarısından fazlası tek karakterse true.
create or replace function public.is_repetitive(t text) returns boolean
language sql immutable parallel safe set search_path = '' as $$
  with c as (
    select ch, count(*) as n
    from regexp_split_to_table(regexp_replace(lower(coalesce(t, '')), '\s', '', 'g'), '') as ch
    where ch <> ''
    group by ch
  )
  select coalesce(max(n)::numeric / nullif(sum(n), 0) > 0.5, true) from c
$$;

create or replace function public.istanbul_today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Europe/Istanbul')::date
$$;

-- ---------------------------------------------------------------- erişim yardımcıları
create or replace function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

create or replace function public.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_roles where user_id = auth.uid())
$$;

-- Görüntüleyen (auth.uid()) bu kullanıcının içeriğini görebilir mi?
create or replace function public.can_view_user(owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when owner = auth.uid() then true
    else exists (
      select 1 from public.profiles p
      where p.id = owner
        and p.deleted_at is null
        and (p.suspended_until is null or p.suspended_until < now())
        and (auth.uid() is null or not public.is_blocked(owner, auth.uid()))
        and (
          not p.is_private
          or exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid() and f.followee_id = owner and f.status = 'accepted'
          )
        )
    )
  end
$$;

-- Çok biçimli hedefin sahibini döndürür (yoksa null).
create or replace function public.content_owner(t public.target_type, tid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select case t
    when 'quote' then (select user_id from public.quotes where id = tid)
    when 'review' then (select user_id from public.reviews where id = tid)
    when 'list' then (select owner_id from public.lists where id = tid)
    when 'comment' then (select user_id from public.comments where id = tid)
    when 'community_post' then (select author_id from public.community_posts where id = tid)
  end
$$;

-- Hedef var, görünür ve görüntüleyen erişebiliyor mu?
create or replace function public.can_view_target(t public.target_type, tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case t
    when 'quote' then exists (select 1 from public.quotes x where x.id = tid and x.status = 'visible' and public.can_view_user(x.user_id))
    when 'review' then exists (select 1 from public.reviews x where x.id = tid and x.status = 'visible' and public.can_view_user(x.user_id))
    when 'list' then exists (select 1 from public.lists x where x.id = tid and (x.is_public or x.owner_id = auth.uid()) and public.can_view_user(x.owner_id))
    when 'comment' then exists (select 1 from public.comments x where x.id = tid and x.status = 'visible' and public.can_view_user(x.user_id))
    when 'community_post' then exists (select 1 from public.community_posts x where x.id = tid and x.status = 'visible' and public.can_view_user(x.author_id))
    else false
  end
$$;

create or replace function public.notify(
  recipient uuid, actor uuid, kind public.notification_type, ttype text, tid uuid, payload jsonb default '{}'
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.user_settings;
begin
  if recipient is null or recipient = actor then
    return;
  end if;
  select * into s from public.user_settings where user_id = recipient;
  if not found then
    return; -- alıcı silinmiş veya siliniyor
  end if;
  if (kind in ('follow', 'follow_request', 'follow_accepted') and s.notify_follows is false)
     or (kind in ('like', 'helpful') and s.notify_likes is false)
     or (kind = 'comment' and s.notify_comments is false)
     or (kind in ('badge', 'level_up') and s.notify_badges is false) then
    return;
  end if;
  insert into public.notifications (recipient_id, actor_id, type, target_type, target_id, data)
  values (recipient, actor, kind, ttype, tid, payload);
end
$$;

-- ---------------------------------------------------------------- genel tetikleyiciler
create or replace function public.tg_set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.tg_set_updated_at();
create trigger user_settings_updated_at before update on public.user_settings for each row execute function public.tg_set_updated_at();
create trigger library_updated_at before update on public.library_entries for each row execute function public.tg_set_updated_at();
create trigger lists_updated_at before update on public.lists for each row execute function public.tg_set_updated_at();
create trigger quotes_updated_at before update on public.quotes for each row execute function public.tg_set_updated_at();
create trigger reviews_updated_at before update on public.reviews for each row execute function public.tg_set_updated_at();

-- Yeni kimlik -> profil + ayarlar
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Korumalı profil alanları yalnızca sunucu tarafından değişir.
create or replace function public.tg_protect_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.total_xp := old.total_xp;
    new.level := old.level;
    new.follower_count := old.follower_count;
    new.following_count := old.following_count;
    new.quote_count := old.quote_count;
    new.review_count := old.review_count;
    new.suspended_until := old.suspended_until;
    new.deleted_at := old.deleted_at;
    new.created_at := old.created_at;
  end if;
  return new;
end
$$;
create trigger profiles_protect before update on public.profiles for each row execute function public.tg_protect_profile();

-- Katalog arama vektörü + istatistik satırı
create or replace function public.tg_media_search() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', public.normalize_text(new.title)), 'A') ||
    setweight(to_tsvector('simple', public.normalize_text(coalesce(new.original_title, ''))), 'B');
  return new;
end
$$;
create trigger media_items_search before insert or update of title, original_title on public.media_items
for each row execute function public.tg_media_search();

create or replace function public.tg_media_stats_row() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.media_stats (media_id) values (new.id) on conflict do nothing;
  return new;
end
$$;
create trigger media_items_stats after insert on public.media_items
for each row execute function public.tg_media_stats_row();

-- ---------------------------------------------------------------- takip ve engelleme
create or replace function public.tg_follows_before() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  priv boolean;
begin
  if public.is_blocked(new.follower_id, new.followee_id) then
    raise exception 'blocked' using errcode = 'P0001', hint = 'Bu kullanıcıyı takip edemezsin.';
  end if;
  if tg_op = 'INSERT' then
    select is_private into priv from public.profiles where id = new.followee_id;
    new.status := case when priv then 'pending' else 'accepted' end;
  end if;
  return new;
end
$$;
create trigger follows_before before insert on public.follows
for each row execute function public.tg_follows_before();

create or replace function public.refresh_follow_counts(u uuid) returns void
language sql security definer set search_path = '' as $$
  update public.profiles p set
    follower_count = (select count(*) from public.follows where followee_id = u and status = 'accepted'),
    following_count = (select count(*) from public.follows where follower_id = u and status = 'accepted')
  where p.id = u
$$;

create or replace function public.tg_follows_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_follow_counts(old.follower_id);
    perform public.refresh_follow_counts(old.followee_id);
    delete from public.activities where verb = 'followed' and actor_id = old.follower_id and target_user_id = old.followee_id;
    delete from public.notifications where actor_id = old.follower_id and recipient_id = old.followee_id
      and type in ('follow', 'follow_request');
    return old;
  end if;

  perform public.refresh_follow_counts(new.follower_id);
  perform public.refresh_follow_counts(new.followee_id);

  if tg_op = 'INSERT' then
    if new.status = 'accepted' then
      insert into public.activities (actor_id, verb, target_user_id) values (new.follower_id, 'followed', new.followee_id);
      perform public.notify(new.followee_id, new.follower_id, 'follow', 'profile', new.follower_id);
    else
      perform public.notify(new.followee_id, new.follower_id, 'follow_request', 'profile', new.follower_id);
    end if;
  elsif old.status = 'pending' and new.status = 'accepted' then
    insert into public.activities (actor_id, verb, target_user_id) values (new.follower_id, 'followed', new.followee_id);
    perform public.notify(new.follower_id, new.followee_id, 'follow_accepted', 'profile', new.followee_id);
  end if;
  return new;
end
$$;
create trigger follows_after after insert or update or delete on public.follows
for each row execute function public.tg_follows_after();

create or replace function public.tg_blocks_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end
$$;
create trigger blocks_after after insert on public.blocks
for each row execute function public.tg_blocks_after();

-- ---------------------------------------------------------------- hız sınırı
create or replace function public.tg_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lim integer;
  n integer;
  uid uuid;
begin
  uid := new.user_id;
  select posts_per_10_min into lim from public.xp_settings;
  lim := coalesce(lim, 10);
  select
    (select count(*) from public.quotes where user_id = uid and created_at > now() - interval '10 minutes') +
    (select count(*) from public.reviews where user_id = uid and created_at > now() - interval '10 minutes') +
    (select count(*) from public.comments where user_id = uid and created_at > now() - interval '10 minutes')
  into n;
  if n >= lim then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'Çok hızlı paylaşım yapıyorsun, birkaç dakika sonra tekrar dene.';
  end if;
  if exists (select 1 from public.profiles where id = uid and suspended_until > now()) then
    raise exception 'suspended' using errcode = 'P0001', hint = 'Hesabın geçici olarak askıya alındı.';
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------- alıntılar ve incelemeler
create or replace function public.tg_content_before() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.body_hash := md5(public.normalize_text(new.body));
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.media_id := old.media_id;
    if current_user in ('authenticated', 'anon') then
      -- Durum ve sayaçları yalnızca sunucu değiştirir
      new.status := old.status;
      new.like_count := old.like_count;
      new.comment_count := old.comment_count;
      if tg_table_name = 'reviews' then
        new.helpful_count := old.helpful_count;
      end if;
    end if;
    if tg_table_name = 'reviews' and new.body is distinct from old.body then
      new.edited_at := now();
    end if;
  end if;
  return new;
end
$$;

create trigger quotes_before before insert or update on public.quotes
for each row execute function public.tg_content_before();
create trigger reviews_before before insert or update on public.reviews
for each row execute function public.tg_content_before();
create trigger quotes_rate before insert on public.quotes for each row execute function public.tg_rate_limit();
create trigger reviews_rate before insert on public.reviews for each row execute function public.tg_rate_limit();
create trigger comments_rate before insert on public.comments for each row execute function public.tg_rate_limit();

create or replace function public.tg_quote_review_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  is_quote boolean := tg_table_name = 'quotes';
  r record;
begin
  if tg_op = 'INSERT' then
    r := new;
    insert into public.activities (actor_id, verb, media_id, object_type, object_id)
    values (r.user_id, case when is_quote then 'quoted'::public.activity_verb else 'reviewed'::public.activity_verb end,
            r.media_id, case when is_quote then 'quote' else 'review' end, r.id);
    if is_quote then
      update public.media_stats set quote_count = quote_count + 1, updated_at = now() where media_id = r.media_id;
      update public.profiles set quote_count = quote_count + 1 where id = r.user_id;
    else
      update public.media_stats set review_count = review_count + 1, updated_at = now() where media_id = r.media_id;
      update public.profiles set review_count = review_count + 1 where id = r.user_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    r := old;
    delete from public.activities where object_type = case when is_quote then 'quote' else 'review' end and object_id = r.id;
    delete from public.activities a using public.likes l
      where a.verb = 'liked' and a.object_type = 'like' and a.object_id = l.id
        and l.target_type = case when is_quote then 'quote'::public.target_type else 'review'::public.target_type end
        and l.target_id = r.id;
    delete from public.likes where target_type = case when is_quote then 'quote'::public.target_type else 'review'::public.target_type end and target_id = r.id;
    delete from public.comments where target_type = case when is_quote then 'quote'::public.target_type else 'review'::public.target_type end and target_id = r.id;
    delete from public.saves where target_type = case when is_quote then 'quote'::public.target_type else 'review'::public.target_type end and target_id = r.id;
    if is_quote then
      update public.media_stats set quote_count = greatest(quote_count - 1, 0), updated_at = now() where media_id = r.media_id;
      update public.profiles set quote_count = greatest(quote_count - 1, 0) where id = r.user_id;
    else
      update public.media_stats set review_count = greatest(review_count - 1, 0), updated_at = now() where media_id = r.media_id;
      update public.profiles set review_count = greatest(review_count - 1, 0) where id = r.user_id;
    end if;
    return old;
  end if;
  return new;
end
$$;
create trigger quotes_after after insert or delete on public.quotes
for each row execute function public.tg_quote_review_after();
create trigger reviews_after after insert or delete on public.reviews
for each row execute function public.tg_quote_review_after();

-- ---------------------------------------------------------------- beğeni, yorum, faydalı oy
create or replace function public.tg_target_check() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
begin
  if not public.can_view_target(new.target_type, new.target_id) then
    raise exception 'target_not_found' using errcode = 'P0001';
  end if;
  owner := public.content_owner(new.target_type, new.target_id);
  if public.is_blocked(owner, new.user_id) then
    raise exception 'blocked' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger likes_check before insert on public.likes for each row execute function public.tg_target_check();
create trigger comments_check before insert on public.comments for each row execute function public.tg_target_check();
create trigger saves_check before insert on public.saves for each row execute function public.tg_target_check();

create or replace function public.bump_counter(t public.target_type, tid uuid, col text, delta integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  tbl text := case t
    when 'quote' then 'quotes' when 'review' then 'reviews' when 'list' then 'lists'
    when 'comment' then 'comments' when 'community_post' then 'community_posts' end;
begin
  if col not in ('like_count', 'comment_count') then
    raise exception 'bad counter';
  end if;
  if t = 'list' and col = 'comment_count' then
    return;
  end if;
  if t = 'comment' and col = 'comment_count' then
    return;
  end if;
  execute format('update public.%I set %I = greatest(%I + $1, 0) where id = $2', tbl, col, col) using delta, tid;
end
$$;

create or replace function public.tg_likes_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
  media uuid;
begin
  if tg_op = 'INSERT' then
    perform public.bump_counter(new.target_type, new.target_id, 'like_count', 1);
    owner := public.content_owner(new.target_type, new.target_id);
    if new.target_type in ('quote', 'review') then
      media := case new.target_type
        when 'quote' then (select media_id from public.quotes where id = new.target_id)
        else (select media_id from public.reviews where id = new.target_id) end;
      insert into public.activities (actor_id, verb, media_id, object_type, object_id, target_user_id)
      values (new.user_id, 'liked', media, 'like', new.id, owner);
    end if;
    perform public.notify(owner, new.user_id, 'like', new.target_type::text, new.target_id);
    return new;
  end if;
  perform public.bump_counter(old.target_type, old.target_id, 'like_count', -1);
  delete from public.activities where object_type = 'like' and object_id = old.id;
  delete from public.notifications where type = 'like' and actor_id = old.user_id and target_id = old.target_id;
  return old;
end
$$;
create trigger likes_after after insert or delete on public.likes
for each row execute function public.tg_likes_after();

create or replace function public.tg_comments_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.bump_counter(new.target_type, new.target_id, 'comment_count', 1);
    perform public.notify(public.content_owner(new.target_type, new.target_id), new.user_id, 'comment', new.target_type::text, new.target_id,
      jsonb_build_object('comment_id', new.id));
    return new;
  end if;
  perform public.bump_counter(old.target_type, old.target_id, 'comment_count', -1);
  return old;
end
$$;
create trigger comments_after after insert or delete on public.comments
for each row execute function public.tg_comments_after();

create or replace function public.tg_helpful_before() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  author uuid;
begin
  select user_id into author from public.reviews where id = new.review_id and status = 'visible';
  if author is null or not public.can_view_user(author) then
    raise exception 'target_not_found' using errcode = 'P0001';
  end if;
  if author = new.user_id then
    raise exception 'own_review' using errcode = 'P0001', hint = 'Kendi incelemeni faydalı olarak işaretleyemezsin.';
  end if;
  return new;
end
$$;
create trigger helpful_before before insert on public.review_helpful_votes
for each row execute function public.tg_helpful_before();

create or replace function public.tg_helpful_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.reviews set helpful_count = helpful_count + 1 where id = new.review_id;
    perform public.notify((select user_id from public.reviews where id = new.review_id), new.user_id, 'helpful', 'review', new.review_id);
    return new;
  end if;
  update public.reviews set helpful_count = greatest(helpful_count - 1, 0) where id = old.review_id;
  return old;
end
$$;
create trigger helpful_after after insert or delete on public.review_helpful_votes
for each row execute function public.tg_helpful_after();

-- ---------------------------------------------------------------- kütüphane
create or replace function public.tg_library_before() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.media_id := old.media_id;
  end if;
  if new.status = 'in_progress' and (tg_op = 'INSERT' or old.status is distinct from 'in_progress') and new.started_at is null then
    new.started_at := now();
  end if;
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.finished_at := coalesce(new.finished_at, now());
    new.started_at := coalesce(new.started_at, new.finished_at);
  end if;
  return new;
end
$$;
create trigger library_before before insert or update on public.library_entries
for each row execute function public.tg_library_before();

create or replace function public.tg_library_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  k public.media_kind;
  v public.activity_verb;
  old_status public.library_status;
  old_rating smallint;
  new_reader boolean;
  old_reader boolean;
begin
  if tg_op = 'DELETE' then
    update public.media_stats set
      user_rating_sum = user_rating_sum - coalesce(old.rating, 0),
      user_rating_count = user_rating_count - (case when old.rating is null then 0 else 1 end),
      reader_count = reader_count - (case when old.status in ('in_progress', 'completed') then 1 else 0 end),
      updated_at = now()
    where media_id = old.media_id;
    delete from public.activities where actor_id = old.user_id and media_id = old.media_id
      and verb in ('started_reading', 'finished_book', 'watched_movie', 'watching_series', 'finished_series');
    return old;
  end if;

  if tg_op = 'UPDATE' then
    old_status := old.status;
    old_rating := old.rating;
  end if;

  new_reader := new.status in ('in_progress', 'completed');
  old_reader := coalesce(old_status in ('in_progress', 'completed'), false);
  update public.media_stats set
    user_rating_sum = user_rating_sum - coalesce(old_rating, 0) + coalesce(new.rating, 0),
    user_rating_count = user_rating_count - (case when old_rating is null then 0 else 1 end) + (case when new.rating is null then 0 else 1 end),
    reader_count = reader_count + (case when new_reader then 1 else 0 end) - (case when old_reader then 1 else 0 end),
    updated_at = now()
  where media_id = new.media_id;

  if old_status is distinct from new.status and not new.is_private then
    select kind into k from public.media_items where id = new.media_id;
    v := case
      when k = 'book' and new.status = 'in_progress' then 'started_reading'
      when k = 'book' and new.status = 'completed' then 'finished_book'
      when k = 'movie' and new.status = 'completed' then 'watched_movie'
      when k = 'series' and new.status = 'in_progress' then 'watching_series'
      when k = 'series' and new.status = 'completed' then 'finished_series'
    end;
    if v is not null then
      insert into public.activities (actor_id, verb, media_id, object_type, object_id)
      values (new.user_id, v, new.media_id, 'media', new.media_id);
    end if;
  end if;
  return new;
end
$$;
create trigger library_after after insert or update or delete on public.library_entries
for each row execute function public.tg_library_after();

-- ---------------------------------------------------------------- listeler ve topluluklar
create or replace function public.tg_lists_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.is_public then
      insert into public.activities (actor_id, verb, object_type, object_id) values (new.owner_id, 'created_list', 'list', new.id);
    end if;
    return new;
  end if;
  delete from public.activities where object_type = 'list' and object_id = old.id;
  delete from public.likes where target_type = 'list' and target_id = old.id;
  delete from public.saves where target_type = 'list' and target_id = old.id;
  return old;
end
$$;
create trigger lists_after after insert or delete on public.lists
for each row execute function public.tg_lists_after();

create or replace function public.tg_list_items_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lid uuid := coalesce(new.list_id, old.list_id);
begin
  update public.lists set item_count = (select count(*) from public.list_items where list_id = lid) where id = lid;
  return coalesce(new, old);
end
$$;
create trigger list_items_after after insert or delete on public.list_items
for each row execute function public.tg_list_items_after();

create or replace function public.tg_communities_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.community_members (community_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return new;
end
$$;
create trigger communities_after after insert on public.communities
for each row execute function public.tg_communities_after();

create or replace function public.tg_community_members_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cid uuid := coalesce(new.community_id, old.community_id);
begin
  update public.communities set member_count = (select count(*) from public.community_members where community_id = cid) where id = cid;
  return coalesce(new, old);
end
$$;
create trigger community_members_after after insert or delete on public.community_members
for each row execute function public.tg_community_members_after();

-- ---------------------------------------------------------------- şikayet ve moderasyon
create or replace function public.set_content_status(ttype text, tid uuid, s public.content_status) returns void
language plpgsql security definer set search_path = '' as $$
begin
  case ttype
    when 'quote' then update public.quotes set status = s where id = tid;
    when 'review' then update public.reviews set status = s where id = tid;
    when 'comment' then update public.comments set status = s where id = tid;
    when 'community_post' then update public.community_posts set status = s where id = tid;
    when 'media' then update public.media_items set moderation_status = s where id = tid;
    else null;
  end case;
end
$$;

-- Aynı içerik 3 farklı kişiden şikayet alırsa inceleme sonuna kadar gizlenir.
-- Telif şikayetinde tek bildirim yeterlidir.
create or replace function public.tg_reports_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  select count(distinct reporter_id) into n from public.reports
  where target_type = new.target_type and target_id = new.target_id and status in ('open', 'reviewing');
  if n >= 3 or new.reason = 'copyright' then
    perform public.set_content_status(new.target_type, new.target_id, 'hidden');
  end if;
  return new;
end
$$;
create trigger reports_after after insert on public.reports
for each row execute function public.tg_reports_after();

create or replace function public.tg_moderation_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
begin
  if not exists (select 1 from public.app_roles where user_id = new.moderator_id) then
    raise exception 'not_moderator' using errcode = '42501';
  end if;
  case new.action
    when 'hide' then perform public.set_content_status(new.target_type, new.target_id, 'hidden');
    when 'remove' then perform public.set_content_status(new.target_type, new.target_id, 'removed');
    when 'restore' then perform public.set_content_status(new.target_type, new.target_id, 'visible');
    when 'suspend_user' then update public.profiles set suspended_until = now() + interval '7 days' where id = new.target_id;
    when 'unsuspend_user' then update public.profiles set suspended_until = null where id = new.target_id;
    else null;
  end case;
  update public.reports set status = case when new.action = 'dismiss' then 'dismissed'::public.report_status else 'actioned'::public.report_status end,
    handled_by = new.moderator_id, handled_at = now()
  where target_type = new.target_type and target_id = new.target_id and status in ('open', 'reviewing');
  if new.target_type = 'profile' then
    owner := new.target_id;
  elsif new.target_type in ('quote', 'review', 'comment', 'community_post') then
    owner := public.content_owner(new.target_type::public.target_type, new.target_id);
  end if;
  if new.action <> 'dismiss' then
    perform public.notify(owner, null, 'moderation', new.target_type, new.target_id,
      jsonb_build_object('action', new.action, 'reason', new.reason));
  end if;
  return new;
end
$$;
create trigger moderation_after after insert on public.moderation_actions
for each row execute function public.tg_moderation_after();
