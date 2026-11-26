import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { haptic } from '../lib/haptics';
import { celebrate } from '../components/Confetti';
import { useUserId } from '../lib/auth';
import type { LibraryEntry, LibraryStatus, MediaDetail, Quote, Review } from '../types/db';

const DETAIL_SELECT = `
  id, kind, title, original_title, year, cover_path, backdrop_path, description,
  book_details(isbn13, publisher, published_date, page_count),
  screen_details(runtime_minutes, genres, season_count),
  media_stats(user_rating_avg, user_rating_count, quote_count, review_count, reader_count),
  external_ratings(source, value, scale, vote_count, attribution_url),
  media_contributors(role, character_name, sort_order, contributors(id, name, photo_path))
`;

// Kütüphane değişince (okudum/okuyorum/okuyacağım, sayfa, favori) profildeki raflar, sayılar ve akış da yenilensin
function refreshLibraryViews(qc: ReturnType<typeof useQueryClient>, uid: string | null) {
  qc.invalidateQueries({ queryKey: ['shelves', uid] });
  qc.invalidateQueries({ queryKey: ['profileSummary', uid] });
  qc.invalidateQueries({ queryKey: ['me'] });
  qc.invalidateQueries({ queryKey: ['feed'] });
  qc.invalidateQueries({ queryKey: ['wrapped'] });
  qc.invalidateQueries({ queryKey: ['streak'] });
  qc.invalidateQueries({ queryKey: ['readingToday'] });
}

export function useMedia(id: string) {
  return useQuery({
    queryKey: ['media', id],
    queryFn: async () => {
      // Detay açılınca kaynaktan tam bilgi istenir (24 saatten yeniyse sunucu atlar).
      supabase.functions.invoke('catalog-import', { body: { media_id: id } }).catch(() => {});
      const { data, error } = await supabase.from('media_items').select(DETAIL_SELECT).eq('id', id).single();
      if (error) throw error;
      return data as unknown as MediaDetail;
    },
  });
}

export function useLibraryEntry(mediaId: string) {
  const uid = useUserId();
  return useQuery({
    queryKey: ['library', uid, mediaId],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('library_entries').select('*').eq('user_id', uid!).eq('media_id', mediaId).maybeSingle();
      if (error) throw error;
      return data as LibraryEntry | null;
    },
  });
}

export function useSetLibrary(mediaId: string) {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { status?: LibraryStatus; rating?: number | null; current_page?: number | null; is_favorite?: boolean }) => {
      const current = qc.getQueryData<LibraryEntry | null>(['library', uid, mediaId]);
      const row = { user_id: uid!, media_id: mediaId, status: patch.status ?? current?.status ?? 'planned', ...patch };
      const { data, error } = await supabase.from('library_entries').upsert(row, { onConflict: 'user_id,media_id' }).select().single();
      if (error) throw error;
      return data as LibraryEntry;
    },
    onMutate: () => haptic.status(),
    onSuccess: (entry, patch) => {
      const before = qc.getQueryData<LibraryEntry | null>(['library', uid, mediaId]);
      if (patch.status === 'completed' && before?.status !== 'completed') celebrate(); // kitap bitti: kutlama
      qc.setQueryData(['library', uid, mediaId], entry);
      qc.invalidateQueries({ queryKey: ['media', mediaId] });
      refreshLibraryViews(qc, uid);
    },
  });
}

// Kaldığın sayfayı sessizce kaydet (titreşim ve akış yenilemesi yok). Kitap rafta yoksa "okuyorum"a eklenir.
export function useSaveCurrentPage(mediaId: string) {
  const uid = useUserId();
  const qc = useQueryClient();
  return async (page: number) => {
    if (!uid) return;
    const current = qc.getQueryData<LibraryEntry | null>(['library', uid, mediaId]);
    if (current && current.current_page === page) return;
    const status: LibraryStatus = !current || current.status === 'planned' ? 'in_progress' : current.status;
    const { data, error } = await supabase.from('library_entries')
      .upsert({ user_id: uid, media_id: mediaId, status, current_page: page }, { onConflict: 'user_id,media_id' }).select().single();
    if (error) throw error;
    qc.setQueryData(['library', uid, mediaId], data as LibraryEntry);
    if (!current || current.status !== status) refreshLibraryViews(qc, uid);
  };
}

export function useRemoveFromLibrary(mediaId: string) {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('library_entries').delete().eq('user_id', uid!).eq('media_id', mediaId);
      if (error) throw error;
    },
    onMutate: () => haptic.status(),
    onSuccess: () => {
      qc.setQueryData(['library', uid, mediaId], null);
      qc.invalidateQueries({ queryKey: ['media', mediaId] });
      refreshLibraryViews(qc, uid);
    },
  });
}

export interface SeasonWithEpisodes {
  id: string;
  season_number: number;
  episodes: { id: string; episode_number: number; title: string | null; air_date: string | null; runtime_minutes: number | null; watched: boolean }[];
}

export function useSeasons(mediaId: string, enabled: boolean) {
  const uid = useUserId();
  return useQuery({
    queryKey: ['seasons', uid, mediaId],
    enabled: enabled && !!uid,
    queryFn: async () => {
      const [{ data: seasons, error }, { data: progress, error: pErr }] = await Promise.all([
        supabase.from('seasons').select('id, season_number, episodes(id, episode_number, title, air_date, runtime_minutes)')
          .eq('media_id', mediaId).gt('season_number', 0).order('season_number'),
        supabase.from('episode_progress').select('episode_id, episodes!inner(seasons!inner(media_id))')
          .eq('user_id', uid!).eq('episodes.seasons.media_id', mediaId),
      ]);
      if (error) throw error;
      if (pErr) throw pErr;
      const seen = new Set((progress ?? []).map((p) => p.episode_id as string));
      return (seasons ?? []).map((s) => ({
        id: s.id,
        season_number: s.season_number,
        episodes: [...(s.episodes ?? [])].sort((a, b) => a.episode_number - b.episode_number).map((e) => ({ ...e, watched: seen.has(e.id) })),
      })) as SeasonWithEpisodes[];
    },
  });
}

export function useToggleEpisode(mediaId: string) {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ episodeId, watched, until }: { episodeId: string; watched: boolean; until?: boolean }) => {
      if (until) {
        const { error } = await supabase.rpc('mark_watched_until', { p_episode: episodeId });
        if (error) throw error;
      } else if (watched) {
        const { error } = await supabase.from('episode_progress').delete().eq('user_id', uid!).eq('episode_id', episodeId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('episode_progress').insert({ user_id: uid!, episode_id: episodeId });
        if (error) throw error;
      }
    },
    onMutate: ({ episodeId, watched, until }) => {
      if (until) haptic.success(); else haptic.select();
      qc.setQueryData<SeasonWithEpisodes[]>(['seasons', uid, mediaId], (old) =>
        old?.map((s) => ({ ...s, episodes: s.episodes.map((e) => (e.id === episodeId ? { ...e, watched: !watched } : e)) })));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['seasons', uid, mediaId] });
      qc.invalidateQueries({ queryKey: ['library', uid, mediaId] });
      qc.invalidateQueries({ queryKey: ['seriesProgress', mediaId] });
      refreshLibraryViews(qc, uid);
    },
  });
}

export function useSeriesProgress(mediaId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['seriesProgress', mediaId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('series_progress', { p_media: mediaId });
      if (error) throw error;
      return (data as { watched: number; total: number; next_episode_id: string | null; next_season: number | null; next_episode: number | null; next_title: string | null }[])[0]!;
    },
  });
}

export type ReviewWithAuthor = Review & { author: { id: string; username: string | null; display_name: string | null; avatar_path: string | null } };

export function useMediaReviews(mediaId: string, sort: 'helpful' | 'recent', spoilerFree: boolean) {
  return useQuery({
    queryKey: ['reviews', mediaId, sort, spoilerFree],
    queryFn: async () => {
      let q = supabase.from('reviews').select('*, author:profiles!reviews_user_id_fkey(id, username, display_name, avatar_path)')
        .eq('media_id', mediaId).is('episode_id', null).eq('status', 'visible');
      if (spoilerFree) q = q.eq('has_spoiler', false);
      q = sort === 'helpful' ? q.order('helpful_count', { ascending: false }) : q.order('created_at', { ascending: false });
      const { data, error } = await q.limit(30);
      if (error) throw error;
      return data as ReviewWithAuthor[];
    },
  });
}

export type QuoteWithAuthor = Quote & { author: { id: string; username: string | null; display_name: string | null; avatar_path: string | null } };

export function useMediaQuotes(mediaId: string) {
  return useQuery({
    queryKey: ['quotes', mediaId],
    queryFn: async () => {
      const { data, error } = await supabase.from('quotes')
        .select('*, author:profiles!quotes_user_id_fkey(id, username, display_name, avatar_path)')
        .eq('media_id', mediaId).eq('status', 'visible').order('like_count', { ascending: false }).limit(30);
      if (error) throw error;
      return data as QuoteWithAuthor[];
    },
  });
}

export function useSimilarMedia(mediaId: string, kind: string | undefined, genres: string[] | undefined) {
  return useQuery({
    queryKey: ['similar', mediaId],
    enabled: !!kind,
    queryFn: async () => {
      let q = supabase.from('media_items').select('id, title, year, cover_path, kind, screen_details!inner(genres)').eq('kind', kind!).neq('id', mediaId);
      if (genres?.length) q = q.overlaps('screen_details.genres', genres);
      const { data, error } = await q.limit(12);
      if (error) throw error;
      return data;
    },
  });
}

export function useMyHistory(mediaId: string) {
  const uid = useUserId();
  return useQuery({
    queryKey: ['history', uid, mediaId],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('activities').select('id, verb, created_at')
        .eq('actor_id', uid!).eq('media_id', mediaId).order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data as { id: string; verb: string; created_at: string }[];
    },
  });
}
