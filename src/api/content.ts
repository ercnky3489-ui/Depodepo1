import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { haptic } from '../lib/haptics';
import { useUserId } from '../lib/auth';

export interface XpResult {
  xp: number;
  withheld_reason: string | null;
}

async function xpFor(sourceId: string): Promise<XpResult> {
  const { data } = await supabase.from('xp_ledger').select('xp, withheld_reason').eq('source_id', sourceId).maybeSingle();
  return { xp: data?.xp ?? 0, withheld_reason: data?.withheld_reason ?? null };
}

export interface QuoteInput {
  media_id: string;
  body: string;
  page_number?: number | null;
  hide_page?: boolean;
  scene_note?: string | null;
  episode_id?: string | null;
  has_spoiler?: boolean;
}

export function useCreateQuote() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: QuoteInput) => {
      const { data, error } = await supabase.from('quotes').insert({ user_id: uid!, ...input, body: input.body.trim() }).select('id').single();
      if (error) throw error;
      return { id: data.id as string, ...(await xpFor(data.id)) };
    },
    onSuccess: (res, input) => {
      if (res.xp > 0) haptic.success();
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['quotes', input.media_id] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => haptic.error(),
  });
}

export interface ReviewInput {
  media_id: string;
  episode_id?: string | null;
  title?: string | null;
  body: string;
  rating: number;
  has_spoiler: boolean;
}

export function useCreateReview() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReviewInput) => {
      const { data, error } = await supabase.from('reviews').insert({ user_id: uid!, ...input, body: input.body.trim() }).select('id').single();
      if (error) throw error;
      return { id: data.id as string, ...(await xpFor(data.id)) };
    },
    onSuccess: (res, input) => {
      if (res.xp > 0) haptic.success();
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['reviews', input.media_id] });
      qc.invalidateQueries({ queryKey: ['media', input.media_id] });
      qc.invalidateQueries({ queryKey: ['library'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => haptic.error(),
  });
}

export function useDeleteContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ table, id }: { table: 'quotes' | 'reviews'; id: string }) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export const REPORT_REASONS = [
  { id: 'spam', label: 'Spam veya reklam' },
  { id: 'harassment', label: 'Taciz veya zorbalık' },
  { id: 'hate', label: 'Nefret söylemi' },
  { id: 'spoiler', label: 'İşaretlenmemiş spoiler' },
  { id: 'copyright', label: 'Telif hakkı ihlali' },
  { id: 'other', label: 'Diğer' },
] as const;

export function useReport() {
  const uid = useUserId();
  return useMutation({
    mutationFn: async (r: { target_type: string; target_id: string; reason: (typeof REPORT_REASONS)[number]['id']; details?: string }) => {
      const { error } = await supabase.from('reports').insert({ reporter_id: uid!, ...r });
      if (error && error.code !== '23505') throw error; // aynı içeriği ikinci kez şikayet etmek sessizce yok sayılır
    },
  });
}
