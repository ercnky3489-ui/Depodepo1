-- Canlı bildirimler ve demo beğenilerinin zamana yayılması.
--
-- 1) Bildirimler Realtime yayınına eklenir: uygulama açıkken yeni bildirim anında gelir
--    (RLS gereği herkes yalnızca kendi bildirimlerini alır).
-- 2) Demo hesapların beğeni/takipleri bir kuyruğa yazılır; her 2 dakikada bir vakti gelenler uygulanır.
--    Böylece beğeniler tek seferde değil, saatlere yayılarak "geldikçe" bildirim olarak düşer.

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

create table if not exists public.demo_action_queue (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('like_quote', 'helpful', 'follow')),
  target_id uuid not null,
  due_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists demo_action_queue_due_idx on public.demo_action_queue (due_at);
alter table public.demo_action_queue enable row level security; -- politika yok: yalnızca servis ve zamanlanmış görev
revoke all on public.demo_action_queue from anon, authenticated;

-- Vakti gelen demo eylemlerini uygular. Yalnızca demo işaretli hesapların eylemleri işlenir.
create or replace function public.demo_drip() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer := 0;
  r record;
begin
  for r in
    delete from public.demo_action_queue q
    where q.id in (select id from public.demo_action_queue where due_at <= now() order by due_at limit 200)
    returning q.*
  loop
    if not exists (select 1 from auth.users u where u.id = r.actor_id and u.raw_app_meta_data->>'demo' = 'true') then
      continue;
    end if;
    begin
      if r.kind = 'like_quote' then
        insert into public.likes (user_id, target_type, target_id) values (r.actor_id, 'quote', r.target_id) on conflict do nothing;
      elsif r.kind = 'helpful' then
        insert into public.review_helpful_votes (user_id, review_id) values (r.actor_id, r.target_id) on conflict do nothing;
      else
        insert into public.follows (follower_id, followee_id, status) values (r.actor_id, r.target_id, 'accepted') on conflict do nothing;
      end if;
      n := n + 1;
    exception when others then
      null; -- hedef silinmiş vb.: atla
    end;
  end loop;
  -- Demo beğeni/takipleri akışı "beğendi" kartlarıyla doldurmasın (bildirimler kalır)
  delete from public.activities a using auth.users u
  where a.actor_id = u.id and u.raw_app_meta_data->>'demo' = 'true' and a.verb in ('liked', 'followed')
    and a.created_at > now() - interval '10 minutes';
  return n;
end
$$;
revoke execute on function public.demo_drip() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'demo-drip') then
    perform cron.unschedule('demo-drip');
  end if;
  perform cron.schedule('demo-drip', '*/2 * * * *', 'select public.demo_drip()');
end $$;
