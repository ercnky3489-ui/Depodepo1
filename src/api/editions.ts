import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useUserId } from '../lib/auth';
import { haptic } from '../lib/haptics';

export interface Edition {
  id: string;
  publisher_id: string | null;
  publisher: string | null;
  translator: string | null;
  edition_year: number | null;
  page_count: number | null;
  isbn13: string | null;
  cover_path: string | null;
  source: 'user' | 'google_books' | 'open_library' | 'publisher_feed';
  pending: boolean;
  reader_count: number;
  is_mine: boolean;
}

export function useEditions(mediaId: string, enabled = true) {
  return useQuery({
    queryKey: ['editions', mediaId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('media_editions', { p_media_id: mediaId });
      if (error) throw error;
      return (data ?? []) as Edition[];
    },
  });
}

export function useAddEdition(mediaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (f: { publisher: string; translator?: string; year?: number | null; pageCount?: number | null; isbn?: string }) => {
      const { data, error } = await supabase.rpc('add_book_edition', {
        p_media_id: mediaId, p_publisher: f.publisher, p_translator: f.translator || null,
        p_year: f.year ?? null, p_page_count: f.pageCount ?? null, p_isbn: f.isbn || null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { haptic.success(); qc.invalidateQueries({ queryKey: ['editions', mediaId] }); },
  });
}

/** Kullanıcının okuduğu baskıyı kütüphanesine işler (kitap kütüphanede yoksa "okuyacağım" olarak ekler). */
export function useSetMyEdition(mediaId: string) {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (editionId: string | null) => {
      const { data: cur } = await supabase.from('library_entries').select('status').eq('user_id', uid!).eq('media_id', mediaId).maybeSingle();
      const { error } = await supabase.from('library_entries').upsert(
        { user_id: uid!, media_id: mediaId, status: cur?.status ?? 'planned', edition_id: editionId },
        { onConflict: 'user_id,media_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      haptic.select();
      qc.invalidateQueries({ queryKey: ['editions', mediaId] });
      qc.invalidateQueries({ queryKey: ['library', uid, mediaId] });
    },
  });
}

/** Galeriden ya da kameradan kapak seçer, kullanıcının klasörüne yükler ve moderasyona önerir. */
export function useSubmitCover(mediaId: string) {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ editionId, source }: { editionId: string; source: 'camera' | 'library' }) => {
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [2, 3], quality: 0.85 };
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) throw new Error('Kamera izni verilmedi.');
      }
      const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets[0]) return null;
      const asset = res.assets[0];
      if ((asset.fileSize ?? 0) > 3 * 1024 * 1024) throw new Error('Görsel en fazla 3 MB olmalı.');
      const path = `${uid}/cover-${editionId.slice(0, 8)}-${Date.now()}.jpg`;
      const body = await (await fetch(asset.uri)).arrayBuffer();
      const up = await supabase.storage.from('user-covers').upload(path, body, { contentType: asset.mimeType ?? 'image/jpeg', upsert: false });
      if (up.error) throw up.error;
      const { error } = await supabase.rpc('submit_cover', { p_edition_id: editionId, p_storage_path: `user-covers/${path}` });
      if (error) {
        await supabase.storage.from('user-covers').remove([path]);
        throw error;
      }
      return path;
    },
    onSuccess: (p) => { if (p) { haptic.success(); qc.invalidateQueries({ queryKey: ['editions', mediaId] }); } },
  });
}

export function usePublisher(publisherId: string) {
  return useQuery({
    queryKey: ['publisher', publisherId],
    queryFn: async () => {
      const [{ data: p, error: e1 }, { data: books, error: e2 }] = await Promise.all([
        supabase.from('publishers').select('id, name, website, verified').eq('id', publisherId).single(),
        supabase.rpc('publisher_books', { p_publisher_id: publisherId, p_limit: 100, p_offset: 0 }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return { publisher: p as { id: string; name: string; website: string | null; verified: boolean },
        books: (books ?? []) as { media_id: string; title: string; cover_path: string | null; edition_year: number | null; reader_count: number }[] };
    },
  });
}

export function useSearchPublishers(q: string) {
  return useQuery({
    queryKey: ['publishers', q],
    enabled: q.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_publishers', { p_query: q, p_limit: 8 });
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; book_count: number; verified: boolean }[];
    },
  });
}

export function isbnValid(raw: string): boolean {
  const s = raw.replace(/[^0-9Xx]/g, '').toUpperCase();
  if (/^\d{13}$/.test(s)) {
    let t = 0;
    for (let i = 0; i < 12; i++) t += Number(s[i]) * (i % 2 ? 3 : 1);
    return (10 - (t % 10)) % 10 === Number(s[12]);
  }
  if (/^\d{9}[\dX]$/.test(s)) {
    let t = 0;
    for (let i = 0; i < 10; i++) t += (s[i] === 'X' ? 10 : Number(s[i])) * (10 - i);
    return t % 11 === 0;
  }
  return false;
}
