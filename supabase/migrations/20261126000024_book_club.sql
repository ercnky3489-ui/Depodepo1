-- Kitap kulübü odaları: her kitap için, bölüm etiketli sohbet.
-- Okur kendi bulunduğu bölümü seçer; daha ileri bölümlere ait mesajlar uygulamada bulanık gösterilir.
-- Engellenen kişilerin mesajları görünmez. Yeni mesajlar canlı gelir (Realtime).

create table if not exists public.club_messages (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media_items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  chapter smallint not null default 1 check (chapter between 0 and 999),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  status public.content_status not null default 'visible',
  created_at timestamptz not null default now()
);
create index if not exists club_messages_media_idx on public.club_messages (media_id, created_at desc);

alter table public.club_messages enable row level security;
drop policy if exists club_select on public.club_messages;
create policy club_select on public.club_messages for select to authenticated
  using ((status = 'visible' and not public.is_blocked(user_id, auth.uid())) or user_id = auth.uid());
drop policy if exists club_insert on public.club_messages;
create policy club_insert on public.club_messages for insert to authenticated
  with check (user_id = auth.uid() and status = 'visible');
drop policy if exists club_delete on public.club_messages;
create policy club_delete on public.club_messages for delete to authenticated using (user_id = auth.uid());
revoke update on public.club_messages from anon, authenticated;

-- Aşırı hızlı mesajı engelle: kişi başı dakikada en çok 10 mesaj
create or replace function public.club_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.club_messages where user_id = new.user_id and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists club_rate on public.club_messages;
create trigger club_rate before insert on public.club_messages for each row execute function public.club_rate_limit();

-- Kitap sayfasında gösterilen mesaj sayısı
create or replace function public.club_count(p_media uuid) returns integer
language sql stable security invoker set search_path = '' as $$
  select count(*)::integer from public.club_messages where media_id = p_media and status = 'visible'
$$;
grant execute on function public.club_count(uuid) to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'club_messages') then
    alter publication supabase_realtime add table public.club_messages;
  end if;
end $$;
