import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { haptic } from '../lib/haptics';
import type { FeedFilter } from '../features/feed/filters';
import type { FeedItem, TargetType } from '../types/db';

const PAGE = 20;

export function useFeed(filter: FeedFilter) {
  return useInfiniteQuery({
    queryKey: ['feed', filter],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('get_feed', { p_filter: filter, p_before: pageParam, p_limit: PAGE });
      if (error) throw error;
      return (data ?? []) as FeedItem[];
    },
    getNextPageParam: (last) => (last.length < PAGE ? null : last[last.length - 1]!.created_at),
  });
}

type FeedPages = InfiniteData<FeedItem[], string | null>;

function patchFeedObject(qc: ReturnType<typeof useQueryClient>, targetId: string, patch: (item: FeedItem) => FeedItem) {
  qc.getQueriesData<FeedPages>({ queryKey: ['feed'] }).forEach(([key, data]) => {
    if (!data) return;
    qc.setQueryData<FeedPages>(key, {
      ...data,
      pages: data.pages.map((page) => page.map((it) => (it.object?.id === targetId ? patch(it) : it))),
    });
  });
}

// İyimser beğeni: arayüz hemen değişir, sunucu sayıyı döndürünce düzeltilir.
export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, id }: { type: TargetType; id: string }) => {
      const { data, error } = await supabase.rpc('toggle_like', { p_type: type, p_id: id });
      if (error) throw error;
      return (data as { liked: boolean; like_count: number }[])[0]!;
    },
    onMutate: ({ id }) => {
      haptic.like();
      patchFeedObject(qc, id, (it) => ({
        ...it,
        liked_by_me: !it.liked_by_me,
        object: it.object ? { ...it.object, like_count: (it.object.like_count ?? 0) + (it.liked_by_me ? -1 : 1) } : it.object,
      }));
    },
    onSuccess: (res, { id }) => {
      patchFeedObject(qc, id, (it) => ({ ...it, liked_by_me: res.liked, object: it.object ? { ...it.object, like_count: res.like_count } : it.object }));
      qc.invalidateQueries({ queryKey: ['likes', id] });
    },
    onError: (_e, { id }) => {
      haptic.error();
      patchFeedObject(qc, id, (it) => ({
        ...it,
        liked_by_me: !it.liked_by_me,
        object: it.object ? { ...it.object, like_count: (it.object.like_count ?? 0) + (it.liked_by_me ? -1 : 1) } : it.object,
      }));
    },
  });
}

export function useToggleSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, id, saved }: { type: TargetType; id: string; saved: boolean }) => {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (saved) {
        const { error } = await supabase.from('saves').delete().match({ user_id: uid, target_type: type, target_id: id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saves').insert({ user_id: uid, target_type: type, target_id: id });
        if (error) throw error;
      }
      return !saved;
    },
    onMutate: ({ id }) => {
      haptic.save();
      patchFeedObject(qc, id, (it) => ({ ...it, saved_by_me: !it.saved_by_me }));
    },
    onError: (_e, { id }) => patchFeedObject(qc, id, (it) => ({ ...it, saved_by_me: !it.saved_by_me })),
  });
}

export function useToggleHelpful() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data, error } = await supabase.rpc('toggle_helpful', { p_review: reviewId });
      if (error) throw error;
      return (data as { helpful: boolean; helpful_count: number }[])[0]!;
    },
    onMutate: () => haptic.like(),
    onSuccess: (res, reviewId) => {
      patchFeedObject(qc, reviewId, (it) => ({ ...it, object: it.object ? { ...it.object, helpful_count: res.helpful_count } : it.object }));
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['helpful', reviewId] });
    },
  });
}
