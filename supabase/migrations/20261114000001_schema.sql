-- BOOKFLIX · 0001 · Şema: uzantılar, enum'lar, tablolar, indeksler
-- Supabase PostgreSQL 15+ üzerinde çalışır. auth.users Supabase tarafından sağlanır.

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------- enum'lar
create type public.media_kind as enum ('book', 'movie', 'series');
create type public.media_source as enum ('open_library', 'google_books', 'tmdb', 'user');
create type public.content_status as enum ('visible', 'pending', 'hidden', 'removed');
create type public.library_status as enum ('planned', 'in_progress', 'completed', 'abandoned');
create type public.follow_status as enum ('accepted', 'pending');
create type public.target_type as enum ('quote', 'review', 'list', 'comment', 'community_post');
create type public.activity_verb as enum (
  'started_reading', 'finished_book', 'watched_movie', 'watching_series', 'finished_series',
  'liked', 'quoted', 'reviewed', 'followed', 'created_list'
);
create type public.xp_action as enum (
  'quote_book', 'quote_screen', 'review_book', 'review_movie', 'review_episode',
  'review_helpful', 'content_liked', 'start_reading', 'log_movie'
);
create type public.report_reason as enum ('spam', 'hate', 'harassment', 'spoiler', 'copyright', 'other');
create type public.report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');
create type public.notification_type as enum (
  'follow', 'follow_request', 'follow_accepted', 'like', 'comment', 'helpful', 'badge', 'level_up', 'moderation'
);
create type public.app_role as enum ('admin', 'moderator');
create type public.contributor_role as enum ('author', 'director', 'writer', 'actor', 'creator');
create type public.community_kind as enum ('book', 'cinema', 'mixed');
create type public.community_role as enum ('owner', 'moderator', 'member');
create type public.moderation_action_kind as enum ('hide', 'remove', 'restore', 'suspend_user', 'unsuspend_user', 'dismiss');

-- ---------------------------------------------------------------- 1. kullanıcı ve sosyal bağ
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext unique
    check (username is null or username ~ '^[a-zA-Z0-9_.]{3,24}$'),
  display_name text check (char_length(display_name) <= 60),
  bio text check (char_length(bio) <= 280),
  avatar_path text,
  is_private boolean not null default false,
  total_xp integer not null default 0,
  level integer not null default 1,
  follower_count integer not null default 0,
  following_count integer not null default 0,
  quote_count integer not null default 0,
  review_count integer not null default 0,
  onboarded_at timestamptz,
  suspended_until timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  notify_follows boolean not null default true,
  notify_likes boolean not null default true,
  notify_comments boolean not null default true,
  notify_badges boolean not null default true,
  hide_unwatched_spoilers boolean not null default true,
  hide_page_numbers_default boolean not null default false,
  show_activity_in_feed boolean not null default true,
  allow_tagging boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  status public.follow_status not null default 'accepted',
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id, status);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  last_seen_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

create table public.app_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  primary key (user_id, role)
);

-- ---------------------------------------------------------------- 2. katalog
create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  kind public.media_kind not null,
  title text not null check (char_length(title) between 1 and 300),
  original_title text,
  year smallint check (year between 1400 and 2100),
  cover_path text,
  backdrop_path text,
  description text,
  language text,
  source public.media_source not null,
  moderation_status public.content_status not null default 'visible',
  created_by uuid references public.profiles (id) on delete set null,
  search_vector tsvector,
  refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index media_items_kind_idx on public.media_items (kind);
create index media_items_search_idx on public.media_items using gin (search_vector);
create index media_items_title_trgm_idx on public.media_items using gin (lower(title) extensions.gin_trgm_ops);

create table public.book_details (
  media_id uuid primary key references public.media_items (id) on delete cascade,
  isbn13 text unique check (isbn13 ~ '^[0-9]{13}$'),
  isbn10 text check (isbn10 ~ '^[0-9]{9}[0-9X]$'),
  publisher text,
  published_date text,
  page_count integer check (page_count > 0 and page_count < 20000)
);

create table public.screen_details (
  media_id uuid primary key references public.media_items (id) on delete cascade,
  runtime_minutes integer check (runtime_minutes > 0),
  genres text[] not null default '{}',
  status text,
  original_language text,
  season_count integer
);

create table public.contributors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_path text,
  tmdb_id integer unique,
  open_library_key text unique,
  created_at timestamptz not null default now()
);
create index contributors_name_trgm_idx on public.contributors using gin (lower(name) extensions.gin_trgm_ops);

create table public.media_contributors (
  media_id uuid not null references public.media_items (id) on delete cascade,
  contributor_id uuid not null references public.contributors (id) on delete cascade,
  role public.contributor_role not null,
  character_name text,
  sort_order integer not null default 0,
  primary key (media_id, contributor_id, role)
);
create index media_contributors_contributor_idx on public.media_contributors (contributor_id);

create table public.external_ids (
  media_id uuid not null references public.media_items (id) on delete cascade,
  source text not null check (source in ('open_library', 'google_books', 'tmdb', 'imdb', 'isbn')),
  external_id text not null,
  primary key (source, external_id)
);
create index external_ids_media_idx on public.external_ids (media_id);

-- Harici puanlar kullanıcı puanlarından fiziksel olarak ayrıdır.
create table public.external_ratings (
  media_id uuid not null references public.media_items (id) on delete cascade,
  source text not null check (source in ('imdb', 'google_books')),
  value numeric(4, 2) not null check (value >= 0 and value <= 10),
  scale smallint not null default 10 check (scale in (5, 10)),
  vote_count integer,
  attribution_url text not null,
  fetched_at timestamptz not null default now(),
  primary key (media_id, source)
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media_items (id) on delete cascade,
  season_number smallint not null check (season_number >= 0),
  title text,
  episode_count integer,
  air_date date,
  unique (media_id, season_number)
);

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  episode_number smallint not null check (episode_number > 0),
  title text,
  air_date date,
  runtime_minutes integer,
  unique (season_id, episode_number)
);

create table public.media_stats (
  media_id uuid primary key references public.media_items (id) on delete cascade,
  user_rating_sum integer not null default 0,
  user_rating_count integer not null default 0,
  user_rating_avg numeric(4, 2) generated always as (
    case when user_rating_count = 0 then null else round(user_rating_sum::numeric / user_rating_count, 2) end
  ) stored,
  quote_count integer not null default 0,
  review_count integer not null default 0,
  reader_count integer not null default 0,
  weekly_score numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- 3. kütüphane ve takip
create table public.library_entries (
  user_id uuid not null references public.profiles (id) on delete cascade,
  media_id uuid not null references public.media_items (id) on delete cascade,
  status public.library_status not null,
  started_at timestamptz,
  finished_at timestamptz,
  current_page integer check (current_page >= 0),
  rating smallint check (rating between 1 and 10),
  is_favorite boolean not null default false,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, media_id)
);
create index library_entries_media_idx on public.library_entries (media_id, status);

create table public.episode_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  episode_id uuid not null references public.episodes (id) on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (user_id, episode_id)
);

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 500),
  is_public boolean not null default true,
  item_count integer not null default 0,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lists_owner_idx on public.lists (owner_id);

create table public.list_items (
  list_id uuid not null references public.lists (id) on delete cascade,
  media_id uuid not null references public.media_items (id) on delete cascade,
  position integer not null default 0,
  note text check (char_length(note) <= 280),
  added_at timestamptz not null default now(),
  primary key (list_id, media_id)
);

-- ---------------------------------------------------------------- 4. içerik ve etkileşim
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  media_id uuid not null references public.media_items (id) on delete cascade,
  episode_id uuid references public.episodes (id) on delete set null,
  body text not null check (char_length(body) between 1 and 600),
  body_hash text,
  page_number integer check (page_number > 0 and page_number < 20000),
  hide_page boolean not null default false,
  scene_note text check (char_length(scene_note) <= 200),
  has_spoiler boolean not null default false,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  status public.content_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quotes_media_idx on public.quotes (media_id, created_at desc);
create index quotes_user_idx on public.quotes (user_id, created_at desc);
create index quotes_popular_idx on public.quotes (like_count desc) where status = 'visible';

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  media_id uuid not null references public.media_items (id) on delete cascade,
  episode_id uuid references public.episodes (id) on delete cascade,
  title text check (char_length(title) <= 140),
  body text not null check (char_length(body) between 1 and 10000),
  body_hash text,
  rating smallint not null check (rating between 1 and 10),
  has_spoiler boolean not null default false,
  helpful_count integer not null default 0,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  status public.content_status not null default 'visible',
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index reviews_one_per_item on public.reviews (user_id, media_id, coalesce(episode_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index reviews_media_idx on public.reviews (media_id, helpful_count desc);
create index reviews_user_idx on public.reviews (user_id, created_at desc);

create table public.review_helpful_votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  review_id uuid not null references public.reviews (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, review_id)
);

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.target_type not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);
create index likes_target_idx on public.likes (target_type, target_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.target_type not null check (target_type <> 'comment'),
  target_id uuid not null,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  like_count integer not null default 0,
  status public.content_status not null default 'visible',
  created_at timestamptz not null default now()
);
create index comments_target_idx on public.comments (target_type, target_id, created_at);

create table public.saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.target_type not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  verb public.activity_verb not null,
  media_id uuid references public.media_items (id) on delete cascade,
  object_type text,
  object_id uuid,
  target_user_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index activities_actor_idx on public.activities (actor_id, created_at desc);
create index activities_object_idx on public.activities (object_type, object_id);

-- ---------------------------------------------------------------- 5. topluluklar
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name text not null check (char_length(name) between 3 and 60),
  description text check (char_length(description) <= 500),
  kind public.community_kind not null default 'mixed',
  owner_id uuid not null references public.profiles (id) on delete cascade,
  is_private boolean not null default false,
  member_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.community_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index community_members_user_idx on public.community_members (user_id);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  media_id uuid references public.media_items (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  review_id uuid references public.reviews (id) on delete set null,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  status public.content_status not null default 'visible',
  created_at timestamptz not null default now()
);
create index community_posts_idx on public.community_posts (community_id, created_at desc);

-- ---------------------------------------------------------------- 6. oyunlaştırma ve bildirim
create table public.xp_rules (
  action public.xp_action primary key,
  xp integer not null check (xp >= 0),
  cap_group text not null,
  daily_count_cap integer,
  daily_xp_cap integer,
  min_chars integer not null default 0,
  active boolean not null default true
);

create table public.xp_settings (
  id boolean primary key default true check (id),
  daily_total_cap integer not null default 300,
  similarity_threshold real not null default 0.8,
  posts_per_10_min integer not null default 10,
  helpful_voter_min_age interval not null default interval '7 days',
  like_giver_min_age interval not null default interval '24 hours',
  helpful_per_voter_author_daily integer not null default 3
);

create table public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action public.xp_action not null,
  source_type text not null,
  source_id uuid not null,
  xp integer not null,
  withheld_reason text,
  day date not null default ((now() at time zone 'Europe/Istanbul')::date),
  created_at timestamptz not null default now(),
  reversed_at timestamptz,
  unique (user_id, action, source_id)
);
create index xp_ledger_user_day_idx on public.xp_ledger (user_id, day);

create table public.levels (
  level integer primary key,
  min_xp integer not null unique
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  icon text not null,
  tiers integer[] not null check (array_length(tiers, 1) = 3),
  sort_order integer not null default 0
);

create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  tier smallint not null default 0 check (tier between 0 and 3),
  progress integer not null default 0,
  awarded_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  target_type text,
  target_id uuid,
  data jsonb not null default '{}',
  read_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unpushed_idx on public.notifications (created_at) where pushed_at is null;

-- ---------------------------------------------------------------- 7. güvenlik ve uyum
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('quote', 'review', 'comment', 'list', 'community_post', 'profile', 'media')),
  target_id uuid not null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 1000),
  status public.report_status not null default 'open',
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index reports_open_idx on public.reports (status, created_at) where status in ('open', 'reviewing');

create table public.copyright_notices (
  id uuid primary key default gen_random_uuid(),
  claimant_name text not null,
  claimant_email text not null,
  work_description text not null,
  target_type text,
  target_id uuid,
  target_url text,
  statement text not null,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.profiles (id),
  target_type text not null,
  target_id uuid not null,
  action public.moderation_action_kind not null,
  reason text,
  report_id uuid references public.reports (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  consent_type text not null check (consent_type in ('kvkk_notice', 'analytics', 'marketing', 'terms')),
  version text not null,
  granted boolean not null,
  created_at timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id, consent_type, created_at desc);

create table public.deletion_requests (
  user_id uuid primary key,
  requested_at timestamptz not null default now(),
  purge_after timestamptz not null default now() + interval '30 days',
  completed_at timestamptz
);
