import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { haptic } from '../lib/haptics';
import { useUserId } from '../lib/auth';
import type { MediaKind, NotificationRow, ProfileSummary, Quote, Review } from '../types/db';

// ---------------------------------------------------------------- profil
export function useProfileSummary(userId: string | null) {
  return useQuery({
    queryKey: ['profileSummary', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('profile_summary', { p_user: userId! });
      if (error) throw error;
      return data as ProfileSummary;
    },
  });
}

export function useUserContent(userId: string | null) {
  return useQuery({
    queryKey: ['userContent', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [quotes, reviews] = await Promise.all([
        supabase.from('quotes').select('*, media:media_items(id, title, kind, cover_path)').eq('user_id', userId!).eq('status', 'visible')
          .order('like_count', { ascending: false }).limit(10),
        supabase.from('reviews').select('*, media:media_items(id, title, kind, cover_path, year)').eq('user_id', userId!).eq('status', 'visible')
          .order('helpful_count', { ascending: false }).limit(20),
      ]);
      if (quotes.error) throw quotes.error;
      if (reviews.error) throw reviews.error;
      type WithMedia = { media: { id: string; title: string; kind: MediaKind; cover_path: string | null; year?: number | null } };
      return { quotes: quotes.data as (Quote & WithMedia)[], reviews: reviews.data as (Review & WithMedia)[] };
    },
  });
}

export function useMonthlyStats(userId: string | null) {
  return useQuery({
    queryKey: ['monthly', userId],
    enabled: !!userId,
    queryFn: async () => {
      const start = new Date(new Date().getFullYear(), 0, 1).toISOString();
      const { data, error } = await supabase.from('library_entries')
        .select('finished_at, media:media_items!inner(kind)').eq('user_id', userId!).eq('status', 'completed').gte('finished_at', start);
      if (error) throw error;
      const months = Array.from({ length: 12 }, () => ({ books: 0, films: 0 }));
      (data ?? []).forEach((r) => {
        const m = new Date(r.finished_at as string).getMonth();
        const kind = (r.media as unknown as { kind: MediaKind }).kind;
        if (kind === 'book') months[m]!.books++;
        else if (kind === 'movie') months[m]!.films++;
      });
      return months;
    },
  });
}

export function useFollow(targetId: string) {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (following: boolean) => {
      if (following) {
        const { error } = await supabase.from('follows').delete().eq('follower_id', uid!).eq('followee_id', targetId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('follows').insert({ follower_id: uid!, followee_id: targetId });
        if (error) throw error;
      }
    },
    onMutate: () => haptic.follow(),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['profileSummary', targetId] });
      qc.invalidateQueries({ queryKey: ['similarUsers'] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useBlock(targetId: string) {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('blocks').insert({ blocker_id: uid!, blocked_id: targetId });
      if (error && error.code !== '23505') throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ---------------------------------------------------------------- keşfet
export function useRecommendations(kind: MediaKind) {
  return useQuery({
    queryKey: ['recommendations', kind],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('recommendations', { p_kind: kind, p_limit: 12 });
      if (error) throw error;
      return data as { id: string; title: string; year: number | null; cover_path: string | null; match: number | null; reason: string }[];
    },
  });
}

export function useTrending(kind: MediaKind) {
  return useQuery({
    queryKey: ['trending', kind],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('trending_media', { p_kind: kind, p_days: 7, p_limit: 10 });
      if (error) throw error;
      return data as { id: string; title: string; year: number | null; cover_path: string | null; activity_count: number; app_rating: number | null }[];
    },
  });
}

export function useTopReviews() {
  return useQuery({
    queryKey: ['topReviews'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('top_reviews', { p_days: 7, p_limit: 5 });
      if (error) throw error;
      const ids = (data as Review[]).map((r) => r.id);
      if (!ids.length) return [];
      const { data: full, error: e2 } = await supabase.from('reviews')
        .select('*, media:media_items(id, title, kind), author:profiles!reviews_user_id_fkey(display_name, username)').in('id', ids);
      if (e2) throw e2;
      return ids.map((id) => full!.find((r) => r.id === id)!).filter(Boolean);
    },
  });
}

export function useTopQuotes() {
  return useQuery({
    queryKey: ['topQuotes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('top_quotes', { p_days: 7, p_limit: 8 });
      if (error) throw error;
      const ids = (data as Quote[]).map((q) => q.id);
      if (!ids.length) return [];
      const { data: full, error: e2 } = await supabase.from('quotes').select('*, media:media_items(id, title, kind)').in('id', ids);
      if (e2) throw e2;
      return ids.map((id) => full!.find((q) => q.id === id)!).filter(Boolean);
    },
  });
}

export function useSimilarUsers() {
  return useQuery({
    queryKey: ['similarUsers'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('similar_users', { p_limit: 10 });
      if (error) throw error;
      return data as { id: string; username: string; display_name: string | null; avatar_path: string | null; match: number; common_count: number; is_following: boolean }[];
    },
  });
}

export function usePopularLists() {
  return useQuery({
    queryKey: ['popularLists'],
    queryFn: async () => {
      const { data, error } = await supabase.from('lists')
        .select('id, title, item_count, like_count, owner:profiles!lists_owner_id_fkey(display_name, username), list_items(position, media:media_items(cover_path, id))')
        .eq('is_public', true).gt('item_count', 2).order('like_count', { ascending: false }).limit(6);
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------- arama
export function useCatalogSearch(q: string, kind: MediaKind | null) {
  return useQuery({
    queryKey: ['search', 'catalog', q, kind],
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('catalog-search', { body: { q, kind } });
      if (error) throw error;
      return (data.results ?? []) as { id: string; kind: MediaKind; title: string; year: number | null; cover_path: string | null; subtitle: string | null }[];
    },
  });
}

export interface GoogleBookHit {
  google_id: string; title: string; authors: string[]; publisher: string | null; year: number | null;
  isbn13: string | null; cover_url: string | null; info_link: string;
}

/** BOOKFLIX kataloğunda olmayan kitaplar için Google Books araması (sonuçlar kataloğa yazılmaz). */
export function useGoogleBooksSearch(q: string, enabled: boolean) {
  return useQuery({
    queryKey: ['search', 'google-books', q],
    enabled: enabled && q.trim().length >= 2,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('books-google', { body: { q } });
      if (error) throw error;
      return (data.items ?? []) as GoogleBookHit[];
    },
  });
}

/** Seçilen Google Books kitabını kataloğa aktarır ve BOOKFLIX kimliğini döner. */
export async function importGoogleBook(googleId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('books-google', { body: { google_id: googleId } });
  if (error) throw error;
  return data.media_id as string;
}

export function usePeopleSearch(q: string) {
  return useQuery({
    queryKey: ['search', 'people', q],
    enabled: q.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_people', { q, p_limit: 20 });
      if (error) throw error;
      return data as { id: string; username: string; display_name: string | null; avatar_path: string | null; level: number; is_following: boolean }[];
    },
  });
}

export function useAuthorSearch(q: string) {
  return useQuery({
    queryKey: ['search', 'authors', q],
    enabled: q.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_contributors', { q, p_role: 'author', p_limit: 20 });
      if (error) throw error;
      return data as { id: string; name: string; photo_path: string | null; work_count: number }[];
    },
  });
}

// ---------------------------------------------------------------- bildirimler
export function useNotifications() {
  const uid = useUserId();
  return useQuery({
    queryKey: ['notifications', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('notifications')
        .select('id, type, target_type, target_id, data, read_at, created_at, actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_path)')
        .eq('recipient_id', uid!).order('created_at', { ascending: false }).limit(60);
      if (error) throw error;
      return data as unknown as NotificationRow[];
    },
  });
}

export function useUnreadCount() {
  const uid = useUserId();
  return useQuery({
    queryKey: ['notifications', 'unread', uid],
    enabled: !!uid,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true })
        .eq('recipient_id', uid!).is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useMarkAllRead() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', uid!).is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useAnswerFollowRequest() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ followerId, accept }: { followerId: string; accept: boolean }) => {
      const q = supabase.from('follows');
      const { error } = accept
        ? await q.update({ status: 'accepted' }).eq('follower_id', followerId).eq('followee_id', uid!)
        : await q.delete().eq('follower_id', followerId).eq('followee_id', uid!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export async function registerPushToken(userId: string): Promise<void> {
  if (!Device.isDevice) return;
  const { status: existing } = await Notifications.getPermissionsAsync();
  const status = existing === 'granted' ? existing : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Bildirimler', importance: Notifications.AndroidImportance.DEFAULT, lightColor: '#00E5A0' });
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  await supabase.from('push_tokens').upsert(
    { user_id: userId, expo_token: token, platform: Platform.OS === 'ios' ? 'ios' : 'android', last_seen_at: new Date().toISOString() },
    { onConflict: 'expo_token' },
  );
}
