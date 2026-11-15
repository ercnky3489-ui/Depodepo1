// Uygulamanın kullandığı veritabanı tipleri. Tam tipler `npm run db:types` ile
// src/types/database.gen.ts'e üretilir; burası okunur alt kümedir.

export type MediaKind = 'book' | 'movie' | 'series';
export type LibraryStatus = 'planned' | 'in_progress' | 'completed' | 'abandoned';
export type TargetType = 'quote' | 'review' | 'list' | 'comment' | 'community_post';
export type ActivityVerb =
  | 'started_reading' | 'finished_book' | 'watched_movie' | 'watching_series' | 'finished_series'
  | 'liked' | 'quoted' | 'reviewed' | 'followed' | 'created_list';

export interface ProfileLite {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_path: string | null;
  level?: number;
}

export interface Profile extends ProfileLite {
  bio: string | null;
  is_private: boolean;
  total_xp: number;
  level: number;
  follower_count: number;
  following_count: number;
  quote_count: number;
  review_count: number;
  onboarded_at: string | null;
  deleted_at: string | null;
}

export interface MediaLite {
  id: string;
  kind: MediaKind;
  title: string;
  year: number | null;
  cover_path: string | null;
  backdrop_path?: string | null;
  authors?: string[];
  page_count?: number | null;
  app_rating?: number | null;
}

export interface Quote {
  id: string;
  user_id: string;
  media_id: string;
  episode_id: string | null;
  body: string;
  page_number: number | null;
  hide_page: boolean;
  scene_note: string | null;
  has_spoiler: boolean;
  like_count: number;
  comment_count: number;
  status: string;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  media_id: string;
  episode_id: string | null;
  title: string | null;
  body: string;
  rating: number;
  has_spoiler: boolean;
  helpful_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  edited_at: string | null;
}

export interface LibraryEntry {
  user_id: string;
  media_id: string;
  status: LibraryStatus;
  current_page: number | null;
  rating: number | null;
  started_at: string | null;
  finished_at: string | null;
  is_favorite: boolean;
  edition_id?: string | null;
}

export interface FeedItem {
  id: string;
  verb: ActivityVerb;
  created_at: string;
  actor: ProfileLite & { level: number };
  media: MediaLite | null;
  object: (Partial<Quote> & Partial<Review> & Partial<LibraryEntry> & { covers?: (string | null)[]; title?: string; item_count?: number; target_type?: TargetType; target_id?: string }) | null;
  target_user: ProfileLite | null;
  liked_by_me: boolean;
  saved_by_me: boolean;
}

export interface MediaDetail {
  id: string;
  kind: MediaKind;
  title: string;
  original_title: string | null;
  year: number | null;
  cover_path: string | null;
  backdrop_path: string | null;
  description: string | null;
  book_details: { isbn13: string | null; publisher: string | null; published_date: string | null; page_count: number | null } | null;
  screen_details: { runtime_minutes: number | null; genres: string[]; season_count: number | null } | null;
  media_stats: { user_rating_avg: number | null; user_rating_count: number; quote_count: number; review_count: number; reader_count: number } | null;
  external_ratings: { source: 'imdb' | 'google_books'; value: number; scale: 5 | 10; vote_count: number | null; attribution_url: string }[];
  media_contributors: { role: string; character_name: string | null; sort_order: number; contributors: { id: string; name: string; photo_path: string | null } }[];
}

export interface BadgeState {
  code: string;
  name: string;
  icon: string;
  tiers: [number, number, number];
  tier: 0 | 1 | 2 | 3;
  progress: number;
  awarded_at: string | null;
}

export interface ProfileSummary {
  restricted: boolean;
  profile: Profile;
  level?: { current_min: number; next_min: number | null };
  xp_today?: number;
  badges?: BadgeState[];
  stats?: { books_completed: number; pages_read: number; movies_watched: number; episodes_watched: number };
  is_following?: boolean;
  follow_pending?: boolean;
}

export interface NotificationRow {
  id: string;
  type: string;
  target_type: string | null;
  target_id: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  actor: ProfileLite | null;
}
