-- BOOKFLIX · 0010 · Eser / baskı ayrımı, yayınevleri ve kapak katkıları
-- Bir kitap (media_items, kind = 'book') bir ESERDİR. Eserin birden çok BASKISI olur:
-- her baskının kendi yayınevi, çevirmeni, yılı, sayfa sayısı, ISBN'i ve kapağı vardır.
-- Baskılar üç yoldan gelir:
--   1. Harici kaynaklar (Google Books, Open Library): book_details yazıldığında tetikleyici
--      ilgili baskıyı oluşturur/günceller (source = kaynak).
--   2. Yayınevi akışları (ONIX vb.): import_media aynı yolu kullanır (source = 'publisher_feed').
--   3. Kullanıcı katkısı: add_book_edition (moderasyona düşer) ve submit_cover (kapak önerisi).
-- Başka sitelerden veri kazıma (scraping) bu tasarımda yoktur.

alter type public.media_source add value if not exists 'publisher_feed';

-- ---------------------------------------------------------------- yardımcılar
create or replace function public.isbn_valid(p text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  s text := upper(regexp_replace(coalesce(p, ''), '[^0-9Xx]', '', 'g'));
  t integer := 0;
  i integer;
begin
  if s ~ '^[0-9]{13}$' then
    for i in 1..12 loop
      t := t + substr(s, i, 1)::integer * case when i % 2 = 0 then 3 else 1 end;
    end loop;
    return (10 - t % 10) % 10 = substr(s, 13, 1)::integer;
  elsif s ~ '^[0-9]{9}[0-9X]$' then
    for i in 1..10 loop
      t := t + (case when substr(s, i, 1) = 'X' then 10 else substr(s, i, 1)::integer end) * (11 - i);
    end loop;
    return t % 11 = 0;
  end if;
  return false;
end
$$;

-- ISBN-10'u ISBN-13'e çevirir; ISBN-13'ü olduğu gibi döner; geçersizse null.
create or replace function public.isbn_to_13(p text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  s text := upper(regexp_replace(coalesce(p, ''), '[^0-9Xx]', '', 'g'));
  b text;
  t integer := 0;
  i integer;
begin
  if not public.isbn_valid(s) then
    return null;
  end if;
  if length(s) = 13 then
    return s;
  end if;
  b := '978' || substr(s, 1, 9);
  for i in 1..12 loop
    t := t + substr(b, i, 1)::integer * case when i % 2 = 0 then 3 else 1 end;
  end loop;
  return b || ((10 - t % 10) % 10)::text;
end
$$;

-- Yayınevi adını karşılaştırma anahtarına çevirir ("Yapı Kredi Yayınları" = "YAPI KREDİ YAYINLARI ").
create or replace function public.publisher_key(p text) returns text
language sql immutable set search_path = '' as $$
  select nullif(btrim(regexp_replace(lower(translate(coalesce(p, ''), 'İIĞÜŞÖÇ', 'iığüşöç')), '\s+', ' ', 'g')), '')
$$;

-- ---------------------------------------------------------------- tablolar
create table public.publishers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  name_key text not null unique,
  website text,
  verified boolean not null default false,      -- yayınevi ile resmî veri anlaşması varsa
  created_at timestamptz not null default now()
);
create index publishers_name_trgm_idx on public.publishers using gin (name_key extensions.gin_trgm_ops);

create table public.book_editions (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media_items (id) on delete cascade,
  publisher_id uuid references public.publishers (id) on delete set null,
  translator text check (char_length(translator) <= 120),
  edition_year smallint check (edition_year between 1400 and 2100),
  page_count integer check (page_count > 0 and page_count < 20000),
  isbn13 text unique check (isbn13 ~ '^[0-9]{13}$'),
  language text,
  cover_path text,
  source text not null check (source in ('user', 'google_books', 'open_library', 'publisher_feed')),
  moderation_status public.content_status not null default 'visible',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index book_editions_media_idx on public.book_editions (media_id);
create index book_editions_publisher_idx on public.book_editions (publisher_id);

create table public.cover_submissions (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.book_editions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null check (storage_path ~ '^user-covers/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index cover_submissions_pending_idx on public.cover_submissions (status, created_at) where status = 'pending';

alter table public.library_entries add column edition_id uuid references public.book_editions (id) on delete set null;

-- ---------------------------------------------------------------- iç fonksiyonlar
create or replace function public.upsert_publisher(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  k text := public.publisher_key(p_name);
  pid uuid;
begin
  if k is null or char_length(k) < 2 then
    return null;
  end if;
  insert into public.publishers (name, name_key) values (btrim(regexp_replace(p_name, '\s+', ' ', 'g')), k)
  on conflict (name_key) do nothing;
  select id into pid from public.publishers where name_key = k;
  return pid;
end
$$;
revoke execute on function public.upsert_publisher(text) from public, anon, authenticated;

-- Harici kaynaktan gelen kitap bilgisi bir baskı olarak da kaydedilir.
create or replace function public.sync_edition_from_book_details() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m record;
  pid uuid;
  eid uuid;
begin
  select source, cover_path, moderation_status, created_by into m from public.media_items where id = new.media_id;
  if m.source = 'user' then
    return new; -- kullanıcı kitapları baskılarını add_book_edition ile ekler
  end if;
  if new.publisher is null and new.isbn13 is null then
    return new;
  end if;
  pid := public.upsert_publisher(new.publisher);
  if new.isbn13 is not null then
    select id into eid from public.book_editions where isbn13 = new.isbn13;
  end if;
  if eid is null then
    select id into eid from public.book_editions
    where media_id = new.media_id and isbn13 is null and publisher_id is not distinct from pid limit 1;
  end if;
  if eid is null then
    insert into public.book_editions (media_id, publisher_id, edition_year, page_count, isbn13, cover_path, source, moderation_status)
    values (new.media_id, pid, nullif(substr(coalesce(new.published_date, ''), 1, 4), '')::smallint, new.page_count,
            new.isbn13, case when m.cover_path like 'http%' then m.cover_path end, m.source::text, m.moderation_status);
  else
    update public.book_editions set
      publisher_id = coalesce(publisher_id, pid),
      isbn13 = coalesce(isbn13, new.isbn13),
      page_count = coalesce(page_count, new.page_count),
      edition_year = coalesce(edition_year, nullif(substr(coalesce(new.published_date, ''), 1, 4), '')::smallint),
      cover_path = case when cover_path like 'storage:%' then cover_path
                        else coalesce(case when m.cover_path like 'http%' then m.cover_path end, cover_path) end
    where id = eid;
  end if;
  return new;
end
$$;
create trigger book_details_sync_edition after insert or update on public.book_details
  for each row execute function public.sync_edition_from_book_details();

-- Kütüphanedeki baskı, aynı esere ait ve kullanıcının görebildiği bir baskı olmalı.
create or replace function public.check_library_edition() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.edition_id is not null and not exists (
    select 1 from public.book_editions e
    where e.id = new.edition_id and e.media_id = new.media_id
      and (e.moderation_status = 'visible' or e.created_by = new.user_id)
  ) then
    raise exception 'edition_mismatch' using errcode = 'P0001', hint = 'Seçilen baskı bu kitaba ait değil.';
  end if;
  return new;
end
$$;
create trigger library_entries_check_edition before insert or update of edition_id on public.library_entries
  for each row execute function public.check_library_edition();

-- ---------------------------------------------------------------- kullanıcı RPC'leri
create or replace function public.add_book_edition(
  p_media_id uuid, p_publisher text, p_translator text default null, p_year integer default null,
  p_page_count integer default null, p_isbn text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  isbn text;
  pid uuid;
  eid uuid;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.media_items where id = p_media_id and kind = 'book'
                 and (moderation_status = 'visible' or created_by = uid)) then
    raise exception 'book_not_found' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_publisher, ''))) < 2 then
    raise exception 'invalid_publisher' using errcode = 'P0001', hint = 'Yayınevi adını yaz.';
  end if;
  if nullif(btrim(coalesce(p_isbn, '')), '') is not null then
    isbn := public.isbn_to_13(p_isbn);
    if isbn is null then
      raise exception 'invalid_isbn' using errcode = 'P0001', hint = 'ISBN geçersiz.';
    end if;
    select id into eid from public.book_editions where isbn13 = isbn;
    if eid is not null then
      return eid; -- bu baskı zaten var
    end if;
  end if;
  if (select count(*) from public.book_editions where created_by = uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'Günde en fazla 20 baskı ekleyebilirsin.';
  end if;
  pid := public.upsert_publisher(p_publisher);
  insert into public.book_editions (media_id, publisher_id, translator, edition_year, page_count, isbn13, source,
                                    moderation_status, created_by)
  values (p_media_id, pid, nullif(btrim(coalesce(p_translator, '')), ''),
          case when p_year between 1400 and 2100 then p_year::smallint end,
          case when p_page_count between 1 and 19999 then p_page_count end,
          isbn, 'user', case when public.is_moderator() then 'visible' else 'pending' end::public.content_status, uid)
  returning id into eid;
  if isbn is not null then
    insert into public.external_ids (media_id, source, external_id) values (p_media_id, 'isbn', isbn) on conflict do nothing;
  end if;
  return eid;
end
$$;

-- Kapak önerisi: dosya önce istemciden user-covers/<uid>/... yoluna yüklenir, sonra bu çağrılır.
create or replace function public.submit_cover(p_edition_id uuid, p_storage_path text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  sid uuid;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if split_part(p_storage_path, '/', 2) <> uid::text then
    raise exception 'invalid_path' using errcode = 'P0001', hint = 'Kapak kendi klasörüne yüklenmeli.';
  end if;
  if not exists (select 1 from public.book_editions where id = p_edition_id
                 and (moderation_status = 'visible' or created_by = uid)) then
    raise exception 'edition_not_found' using errcode = 'P0001';
  end if;
  if (select count(*) from public.cover_submissions where user_id = uid and created_at > now() - interval '1 day') >= 15 then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'Günde en fazla 15 kapak önerebilirsin.';
  end if;
  insert into public.cover_submissions (edition_id, user_id, storage_path) values (p_edition_id, uid, p_storage_path)
  returning id into sid;
  if public.is_moderator() then
    perform public.moderate_cover(sid, true);
  end if;
  return sid;
end
$$;

create or replace function public.moderate_cover(p_submission_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s record;
begin
  if not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into s from public.cover_submissions where id = p_submission_id for update;
  if s is null or s.status <> 'pending' then
    raise exception 'not_pending' using errcode = 'P0001';
  end if;
  update public.cover_submissions set status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_by = auth.uid(), reviewed_at = now() where id = p_submission_id;
  if p_approve then
    update public.book_editions set cover_path = 'storage:' || s.storage_path where id = s.edition_id;
    -- Eserin kapağı yoksa ya da harici bir bağlantıysa onaylı kapak kullanılır.
    update public.media_items m set cover_path = 'storage:' || s.storage_path
    from public.book_editions e where e.id = s.edition_id and m.id = e.media_id
      and (m.cover_path is null or m.cover_path not like 'storage:%');
  end if;
end
$$;

create or replace function public.moderate_edition(p_edition_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.book_editions set moderation_status = case when p_approve then 'visible' else 'removed' end::public.content_status
  where id = p_edition_id;
end
$$;

-- Eser sayfası: baskılar, okur sayısına göre
create or replace function public.media_editions(p_media_id uuid)
returns table (id uuid, publisher_id uuid, publisher text, translator text, edition_year smallint, page_count integer,
               isbn13 text, cover_path text, source text, pending boolean, reader_count bigint, is_mine boolean)
language sql stable security definer set search_path = '' as $$
  select e.id, p.id, p.name, e.translator, e.edition_year, e.page_count, e.isbn13, e.cover_path, e.source,
         e.moderation_status = 'pending',
         (select count(*) from public.library_entries l where l.edition_id = e.id),
         exists (select 1 from public.library_entries l where l.edition_id = e.id and l.user_id = auth.uid())
  from public.book_editions e
  left join public.publishers p on p.id = e.publisher_id
  where e.media_id = p_media_id
    and (e.moderation_status = 'visible' or e.created_by = auth.uid() or public.is_moderator())
  order by 11 desc, e.created_at
$$;

-- Yayınevi sayfası
create or replace function public.publisher_books(p_publisher_id uuid, p_limit integer default 30, p_offset integer default 0)
returns table (media_id uuid, title text, cover_path text, edition_year smallint, reader_count bigint)
language sql stable security definer set search_path = '' as $$
  select m.id, m.title, coalesce(max(e.cover_path), m.cover_path), max(e.edition_year),
         (select count(*) from public.library_entries l where l.media_id = m.id)
  from public.book_editions e
  join public.media_items m on m.id = e.media_id and m.moderation_status = 'visible'
  where e.publisher_id = p_publisher_id and e.moderation_status = 'visible'
  group by m.id
  order by 5 desc, m.title
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
$$;

create or replace function public.search_publishers(p_query text, p_limit integer default 10)
returns table (id uuid, name text, book_count bigint, verified boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name,
         (select count(distinct e.media_id) from public.book_editions e where e.publisher_id = p.id and e.moderation_status = 'visible'),
         p.verified
  from public.publishers p
  where p.name_key like '%' || public.publisher_key(p_query) || '%'
  order by 3 desc, p.name
  limit least(greatest(p_limit, 1), 50)
$$;

-- ISBN ile arama (barkod okutma bunu kullanır)
create or replace function public.find_by_isbn(p_isbn text) returns table (media_id uuid, edition_id uuid)
language sql stable security definer set search_path = '' as $$
  select e.media_id, e.id from public.book_editions e
  where e.isbn13 = public.isbn_to_13(p_isbn)
    and (e.moderation_status = 'visible' or e.created_by = auth.uid())
  union all
  select d.media_id, null from public.book_details d
  where d.isbn13 = public.isbn_to_13(p_isbn)
    and not exists (select 1 from public.book_editions e where e.isbn13 = d.isbn13)
  limit 1
$$;

-- ---------------------------------------------------------------- RLS
alter table public.publishers enable row level security;
alter table public.book_editions enable row level security;
alter table public.cover_submissions enable row level security;

grant select on public.publishers, public.book_editions, public.cover_submissions to authenticated;
revoke insert, update, delete on public.publishers, public.book_editions, public.cover_submissions from authenticated;
revoke execute on function public.sync_edition_from_book_details() from public, anon, authenticated;
revoke execute on function public.check_library_edition() from public, anon, authenticated;
grant execute on function public.add_book_edition(uuid, text, text, integer, integer, text),
  public.submit_cover(uuid, text), public.moderate_cover(uuid, boolean), public.moderate_edition(uuid, boolean),
  public.media_editions(uuid), public.publisher_books(uuid, integer, integer), public.search_publishers(text, integer),
  public.find_by_isbn(text), public.isbn_valid(text), public.isbn_to_13(text) to authenticated;

create policy publishers_select on public.publishers for select to authenticated using (true);
create policy book_editions_select on public.book_editions for select to authenticated
  using (moderation_status = 'visible' or created_by = auth.uid() or public.is_moderator());
create policy cover_submissions_select on public.cover_submissions for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());

-- Mevcut kayıtlar için baskıları bir kez oluştur
update public.book_details set publisher = publisher;
