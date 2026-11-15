// Eser seçici: Paylaş akışlarında hangi kitap/film/dizi üzerine işlem yapılacağını seçtirir.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { importGoogleBook, useCatalogSearch, useGoogleBooksSearch, type GoogleBookHit } from '../../src/api/social';
import { IconBack } from '../../src/components/icons';
import { Button, Cover, EmptyState, Loading, T } from '../../src/components/ui';
import { useUserId } from '../../src/lib/auth';
import { errorMessage, supabase } from '../../src/lib/supabase';
import { Image } from 'expo-image';
import { inputStyle } from '../../src/theme/inputs';
import { color, space } from '../../src/theme/tokens';
import type { MediaKind } from '../../src/types/db';

type Next = 'quote' | 'review' | 'status' | 'list';

export default function Pick() {
  const { next, kind, listId } = useLocalSearchParams<{ next: Next; kind?: 'book' | 'screen'; listId?: string }>();
  const uid = useUserId();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { const t = setTimeout(() => setQ(text.trim()), 300); return () => clearTimeout(t); }, [text]);
  const searchKind: MediaKind | null = kind === 'book' ? 'book' : null;
  const results = useCatalogSearch(q, searchKind);
  const wantsBooks = kind !== 'screen';
  const google = useGoogleBooksSearch(q, wantsBooks);
  const [importing, setImporting] = useState<string | null>(null);

  // Arama boşken: son kütüphane kayıtları (en olası seçimler)
  const recent = useQuery({
    queryKey: ['recentLibrary', uid],
    queryFn: async () => {
      const { data, error } = await supabase.from('library_entries').select('updated_at, media:media_items!inner(id, title, kind, cover_path, year)')
        .eq('user_id', uid!).order('updated_at', { ascending: false }).limit(20);
      if (error) throw error;
      return (data ?? []).map((r) => r.media as unknown as { id: string; title: string; kind: MediaKind; cover_path: string | null; year: number | null });
    },
  });

  const items = (q.length >= 2 ? results.data ?? [] : recent.data ?? [])
    .filter((m) => (kind === 'screen' ? m.kind !== 'book' : kind === 'book' ? m.kind === 'book' : true));

  const choose = async (m: { id: string; kind: MediaKind; title: string }) => {
    if (next === 'quote') router.replace({ pathname: '/compose/quote', params: { mediaId: m.id } });
    else if (next === 'review') router.replace({ pathname: '/compose/review', params: { mediaId: m.id } });
    else if (next === 'list' && listId) {
      const { count } = await supabase.from('list_items').select('media_id', { count: 'exact', head: true }).eq('list_id', listId);
      const { error } = await supabase.from('list_items').insert({ list_id: listId, media_id: m.id, position: count ?? 0 });
      if (error && error.code !== '23505') { Alert.alert('Eklenemedi', 'Lütfen tekrar dene.'); return; }
      qc.invalidateQueries({ queryKey: ['list', listId] });
      router.back();
    } else router.replace(`/media/${m.id}`);
  };

  const chooseGoogle = async (g: GoogleBookHit) => {
    setImporting(g.google_id);
    try {
      const id = await importGoogleBook(g.google_id);
      await choose({ id, kind: 'book', title: g.title });
    } catch (e) {
      Alert.alert('Eklenemedi', errorMessage(e));
    } finally {
      setImporting(null);
    }
  };
  const googleItems = google.data ?? [];

  const title = next === 'quote' ? 'Hangi eserden alıntı?' : next === 'review' ? 'Neyi inceliyorsun?' : next === 'list' ? 'Listeye ekle' : kind === 'book' ? 'Hangi kitap?' : 'Hangi film veya dizi?';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ padding: space[4], gap: space[3] }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, justifyContent: 'center' }}><IconBack /></Pressable>
        <T v="displayLg">{title}</T>
        <TextInput value={text} onChangeText={setText} autoFocus placeholder="Ad, yazar veya ISBN" placeholderTextColor={color.textFaint} accessibilityLabel="Eser ara" style={inputStyle} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: 40 }}
        ListHeaderComponent={q.length < 2 && items.length ? <T v="overline" c={color.textMuted} style={{ marginBottom: space[2] }}>SON KAYITLARIN</T> : results.isFetching ? <Loading /> : undefined}
        ListFooterComponent={wantsBooks && q.length >= 2 ? (
          <View style={{ marginTop: space[6] }}>
            <T v="overline" c={color.textMuted}>GOOGLE BOOKS'TA</T>
            {google.isFetching ? <Loading /> : null}
            {google.isError ? <T v="caption" c={color.textMuted} style={{ marginTop: space[2] }}>Google Books'a şu an ulaşılamıyor.</T> : null}
            {!google.isFetching && !google.isError && googleItems.length === 0 ? <T v="caption" c={color.textMuted} style={{ marginTop: space[2] }}>Google Books'ta da bulunamadı.</T> : null}
            {googleItems.map((g) => (
              <Pressable key={g.google_id} onPress={() => chooseGoogle(g)} disabled={!!importing} accessibilityRole="button"
                accessibilityLabel={`${g.title}, ${g.authors.join(', ')}`} accessibilityHint="Kitabı BOOKFLIX'e ekler ve seçer"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, borderBottomWidth: 1, borderBottomColor: '#141D19' }}>
                <View style={{ width: 40, height: 60, borderRadius: 4, overflow: 'hidden', backgroundColor: color.surface }}>
                  {g.cover_url ? <Image source={{ uri: g.cover_url }} style={{ width: 40, height: 60 }} contentFit="cover" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <T v="label" style={{ fontSize: 15 }} numberOfLines={2}>{g.title}</T>
                  <T v="caption" c={color.textMuted} numberOfLines={1}>{[g.authors.join(', '), g.publisher, g.year].filter(Boolean).join(' · ')}</T>
                </View>
                {importing === g.google_id ? <ActivityIndicator color={color.primary} /> : <T v="caption" c={color.primary}>Ekle</T>}
              </Pressable>
            ))}
            {googleItems.length ? (
              <Pressable onPress={() => Linking.openURL('https://books.google.com')} accessibilityRole="link" style={{ marginTop: space[2] }}>
                <T v="caption" c={color.textFaint}>Sonuçlar: Google Books</T>
              </Pressable>
            ) : null}
          </View>
        ) : undefined}
        ListEmptyComponent={results.isFetching ? undefined : q.length >= 2 ? (
          <View><EmptyState title="BOOKFLIX kataloğunda yok" body={wantsBooks ? "Aşağıdaki Google Books sonuçlarından seçebilir ya da ISBN ile ekleyebilirsin." : "Başka bir adla aramayı dene."} /><Button title="ISBN ile kitap ekle" onPress={() => router.push('/compose/isbn')} /></View>
        ) : <EmptyState title="Aramaya başla" body="En az 2 harf yaz." />}
        renderItem={({ item: m }) => (
          <Pressable onPress={() => choose(m)} accessibilityRole="button" accessibilityLabel={m.title}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, borderBottomWidth: 1, borderBottomColor: '#141D19' }}>
            <Cover id={m.id} path={m.cover_path} width={40} />
            <View style={{ flex: 1 }}>
              <T v="label" style={{ fontSize: 15 }}>{m.title}</T>
              <T v="caption" c={color.textMuted}>{m.kind === 'book' ? 'Kitap' : m.kind === 'movie' ? 'Film' : 'Dizi'}{m.year ? ` · ${m.year}` : ''}</T>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
