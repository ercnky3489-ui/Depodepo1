-- Profil ayrıntıları: okul, meslek, konum, sosyal hesaplar, kapak, yıllık okuma hedefi ve doğum tarihi.
--   * Herkese açık alanlar profiles tablosunda; RLS zaten herkese açık okumayı (engellenmeyen) veriyor.
--   * Doğum tarihi profile_private tablosunda: yalnızca sahibi görür; başkaları yalnızca sahibi
--     'show_birthdate' açtıysa ve hesabı görebiliyorsa görür.
--   * Yıllık okuma hedefi reading_goals tablosunda (kullanıcı başına yıl başına bir hedef).

alter table public.profiles
  add column if not exists school text check (char_length(school) <= 80),
  add column if not exists occupation text check (char_length(occupation) <= 80),
  add column if not exists city text check (char_length(city) <= 40),
  add column if not exists district text check (char_length(district) <= 40),
  add column if not exists instagram text check (instagram is null or char_length(instagram) <= 40),
  add column if not exists facebook text check (facebook is null or char_length(facebook) <= 80),
  add column if not exists twitter text check (twitter is null or char_length(twitter) <= 40),
  add column if not exists cover_path text check (char_length(cover_path) <= 200);

create table if not exists public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  birth_date date check (birth_date >= '1900-01-01'),
  show_birthdate boolean not null default false
);
alter table public.profile_private enable row level security;
create policy profile_private_select on public.profile_private for select to authenticated
  using (user_id = auth.uid() or (show_birthdate and public.can_view_user(user_id)));
create policy profile_private_insert on public.profile_private for insert to authenticated
  with check (user_id = auth.uid());
create policy profile_private_update on public.profile_private for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profile_private_delete on public.profile_private for delete to authenticated
  using (user_id = auth.uid());

create table if not exists public.reading_goals (
  user_id uuid not null references public.profiles (id) on delete cascade,
  year smallint not null check (year between 2000 and 2100),
  target integer not null check (target between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, year)
);
alter table public.reading_goals enable row level security;
create policy reading_goals_select on public.reading_goals for select to authenticated
  using (user_id = auth.uid() or public.can_view_user(user_id));
create policy reading_goals_insert on public.reading_goals for insert to authenticated
  with check (user_id = auth.uid());
create policy reading_goals_update on public.reading_goals for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reading_goals_delete on public.reading_goals for delete to authenticated
  using (user_id = auth.uid());
create trigger reading_goals_updated_at before update on public.reading_goals
  for each row execute function public.tg_set_updated_at();
