-- Web Push abonelikleri (telefon/bilgisayar tarayıcısı ve ana ekrana eklenen uygulama).
-- Her cihaz kendi aboneliğini kaydeder; bildirim gönderici (push-dispatch) bunları kullanır.
create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists web_push_subscriptions_user_idx on public.web_push_subscriptions (user_id);
alter table public.web_push_subscriptions enable row level security;
drop policy if exists web_push_own on public.web_push_subscriptions;
create policy web_push_own on public.web_push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
