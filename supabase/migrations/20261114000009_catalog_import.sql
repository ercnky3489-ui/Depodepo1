-- BOOKFLIX · 0009 · Harici katalog verisini tekrarsız içe aktarma
-- Edge Function'lar (catalog-search, catalog-import, catalog-refresh) normalize ettikleri
-- kaydı bu fonksiyona verir. Eşleşme sırası: harici kimlik -> ISBN-13 -> yeni kayıt.
-- Yalnızca servis rolü çağırır.

create or replace function public.import_media(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  mid uuid;
  e jsonb;
  c jsonb;
  s jsonb;
  ep jsonb;
  cid uuid;
  sid uuid;
  isbn text := nullif(p #>> '{book,isbn13}', '');
begin
  if p ->> 'kind' not in ('book', 'movie', 'series') or coalesce(btrim(p ->> 'title'), '') = '' then
    raise exception 'invalid_payload';
  end if;

  select x.media_id into mid from public.external_ids x
  join jsonb_array_elements(coalesce(p -> 'external_ids', '[]')) j
    on x.source = j ->> 'source' and x.external_id = j ->> 'external_id'
  limit 1;
  if mid is null and isbn is not null then
    select media_id into mid from public.book_details where isbn13 = isbn;
  end if;

  if mid is null then
    insert into public.media_items (kind, title, original_title, year, cover_path, backdrop_path, description, language, source)
    values ((p ->> 'kind')::public.media_kind, p ->> 'title', p ->> 'original_title', (p ->> 'year')::smallint,
            p ->> 'cover_url', p ->> 'backdrop_url', p ->> 'description', p ->> 'language', (p ->> 'source')::public.media_source)
    returning id into mid;
  else
    update public.media_items set
      title = coalesce(nullif(p ->> 'title', ''), title),
      original_title = coalesce(p ->> 'original_title', original_title),
      year = coalesce((p ->> 'year')::smallint, year),
      cover_path = case when cover_path like 'storage:%' then cover_path else coalesce(p ->> 'cover_url', cover_path) end,
      backdrop_path = coalesce(p ->> 'backdrop_url', backdrop_path),
      description = coalesce(nullif(p ->> 'description', ''), description),
      language = coalesce(p ->> 'language', language),
      refreshed_at = now()
    where id = mid;
  end if;

  for e in select * from jsonb_array_elements(coalesce(p -> 'external_ids', '[]')) loop
    insert into public.external_ids (media_id, source, external_id) values (mid, e ->> 'source', e ->> 'external_id')
    on conflict do nothing;
  end loop;

  if p ? 'book' then
    insert into public.book_details (media_id, isbn13, isbn10, publisher, published_date, page_count)
    values (mid, isbn, nullif(p #>> '{book,isbn10}', ''), p #>> '{book,publisher}', p #>> '{book,published_date}',
            nullif(p #>> '{book,page_count}', '')::integer)
    on conflict (media_id) do update set
      isbn13 = coalesce(public.book_details.isbn13, excluded.isbn13),
      isbn10 = coalesce(public.book_details.isbn10, excluded.isbn10),
      publisher = coalesce(excluded.publisher, public.book_details.publisher),
      published_date = coalesce(excluded.published_date, public.book_details.published_date),
      page_count = coalesce(excluded.page_count, public.book_details.page_count);
  end if;

  if p ? 'screen' then
    insert into public.screen_details (media_id, runtime_minutes, genres, status, original_language, season_count)
    values (mid, nullif(p #>> '{screen,runtime_minutes}', '')::integer,
            coalesce(array(select jsonb_array_elements_text(p #> '{screen,genres}')), '{}'),
            p #>> '{screen,status}', p #>> '{screen,original_language}', nullif(p #>> '{screen,season_count}', '')::integer)
    on conflict (media_id) do update set
      runtime_minutes = coalesce(excluded.runtime_minutes, public.screen_details.runtime_minutes),
      genres = case when cardinality(excluded.genres) > 0 then excluded.genres else public.screen_details.genres end,
      status = coalesce(excluded.status, public.screen_details.status),
      original_language = coalesce(excluded.original_language, public.screen_details.original_language),
      season_count = coalesce(excluded.season_count, public.screen_details.season_count);
  end if;

  if jsonb_array_length(coalesce(p -> 'contributors', '[]')) > 0 then
    delete from public.media_contributors where media_id = mid;
    for c in select * from jsonb_array_elements(p -> 'contributors') loop
      cid := null;
      if c ? 'tmdb_id' then
        select id into cid from public.contributors where tmdb_id = (c ->> 'tmdb_id')::integer;
      elsif c ? 'open_library_key' then
        select id into cid from public.contributors where open_library_key = c ->> 'open_library_key';
      else
        select id into cid from public.contributors where name = c ->> 'name' and tmdb_id is null and open_library_key is null limit 1;
      end if;
      if cid is null then
        insert into public.contributors (name, photo_path, tmdb_id, open_library_key)
        values (c ->> 'name', c ->> 'photo_url', (c ->> 'tmdb_id')::integer, c ->> 'open_library_key')
        returning id into cid;
      end if;
      insert into public.media_contributors (media_id, contributor_id, role, character_name, sort_order)
      values (mid, cid, (c ->> 'role')::public.contributor_role, c ->> 'character', coalesce((c ->> 'order')::integer, 0))
      on conflict do nothing;
    end loop;
  end if;

  if p -> 'external_rating' is not null and jsonb_typeof(p -> 'external_rating') = 'object' then
    insert into public.external_ratings (media_id, source, value, scale, vote_count, attribution_url, fetched_at)
    values (mid, p #>> '{external_rating,source}', (p #>> '{external_rating,value}')::numeric,
            coalesce((p #>> '{external_rating,scale}')::smallint, 10), (p #>> '{external_rating,vote_count}')::integer,
            p #>> '{external_rating,attribution_url}', now())
    on conflict (media_id, source) do update set value = excluded.value, scale = excluded.scale,
      vote_count = excluded.vote_count, attribution_url = excluded.attribution_url, fetched_at = now();
  end if;

  for s in select * from jsonb_array_elements(coalesce(p -> 'seasons', '[]')) loop
    insert into public.seasons (media_id, season_number, title, episode_count, air_date)
    values (mid, (s ->> 'season_number')::smallint, s ->> 'title', (s ->> 'episode_count')::integer, (s ->> 'air_date')::date)
    on conflict (media_id, season_number) do update set title = coalesce(excluded.title, public.seasons.title),
      episode_count = coalesce(excluded.episode_count, public.seasons.episode_count),
      air_date = coalesce(excluded.air_date, public.seasons.air_date)
    returning id into sid;
    for ep in select * from jsonb_array_elements(coalesce(s -> 'episodes', '[]')) loop
      insert into public.episodes (season_id, episode_number, title, air_date, runtime_minutes)
      values (sid, (ep ->> 'episode_number')::smallint, ep ->> 'title', (ep ->> 'air_date')::date, (ep ->> 'runtime_minutes')::integer)
      on conflict (season_id, episode_number) do update set title = coalesce(excluded.title, public.episodes.title),
        air_date = coalesce(excluded.air_date, public.episodes.air_date),
        runtime_minutes = coalesce(excluded.runtime_minutes, public.episodes.runtime_minutes);
    end loop;
  end loop;

  return mid;
end
$$;
revoke execute on function public.import_media(jsonb) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.import_media(jsonb) to service_role;
  end if;
end $$;

-- catalog-refresh için: en eski TMDB kayıtları
create or replace function public.stale_tmdb_media(p_older_than_days integer, p_limit integer)
returns table (media_id uuid, kind public.media_kind, tmdb_id text)
language sql stable security definer set search_path = '' as $$
  select m.id, m.kind, x.external_id from public.media_items m
  join public.external_ids x on x.media_id = m.id and x.source = 'tmdb'
  where m.refreshed_at < now() - make_interval(days => p_older_than_days)
  order by m.refreshed_at
  limit p_limit
$$;
revoke execute on function public.stale_tmdb_media(integer, integer) from public, anon, authenticated;

-- Kullanıcının katalogda olmayan bir kitabı eklemesi. Kayıt moderasyona düşer (pending);
-- ekleyen kişi hemen görür ve kütüphanesine alabilir, diğerleri onaydan sonra görür.
create or replace function public.add_user_book(
  p_title text, p_author text, p_isbn13 text default null, p_page_count integer default null, p_year integer default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  mid uuid;
  cid uuid;
  isbn text := nullif(regexp_replace(coalesce(p_isbn13, ''), '[^0-9]', '', 'g'), '');
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) < 1 or char_length(btrim(coalesce(p_author, ''))) < 2 then
    raise exception 'invalid_book' using errcode = 'P0001', hint = 'Kitap adı ve yazar gerekli.';
  end if;
  if isbn is not null then
    if isbn !~ '^[0-9]{13}$' then
      raise exception 'invalid_isbn' using errcode = 'P0001', hint = 'ISBN 13 haneli olmalı.';
    end if;
    select media_id into mid from public.book_details where isbn13 = isbn;
    if mid is not null then
      return mid; -- zaten katalogda
    end if;
  end if;
  if (select count(*) from public.media_items where created_by = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'Günde en fazla 10 kitap ekleyebilirsin.';
  end if;
  insert into public.media_items (kind, title, year, source, moderation_status, created_by)
  values ('book', btrim(p_title), p_year::smallint, 'user', 'pending', auth.uid())
  returning id into mid;
  insert into public.book_details (media_id, isbn13, page_count) values (mid, isbn, nullif(p_page_count, 0));
  if isbn is not null then
    insert into public.external_ids (media_id, source, external_id) values (mid, 'isbn', isbn) on conflict do nothing;
  end if;
  select id into cid from public.contributors where name = btrim(p_author) and tmdb_id is null and open_library_key is null limit 1;
  if cid is null then
    insert into public.contributors (name) values (btrim(p_author)) returning id into cid;
  end if;
  insert into public.media_contributors (media_id, contributor_id, role) values (mid, cid, 'author');
  return mid;
end
$$;
