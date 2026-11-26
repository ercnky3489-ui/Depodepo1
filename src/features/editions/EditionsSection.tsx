import { router } from 'expo-router';
import { ActionSheetIOS, Alert, Platform, Pressable, View } from 'react-native';
import { useEditions, useSetMyEdition, useSubmitCover, type Edition } from '../../api/editions';
import { Cover, Overline, T } from '../../components/ui';
import { errorMessage } from '../../lib/supabase';
import { color, radius, space } from '../../theme/tokens';

const SOURCE: Record<Edition['source'], string> = {
  user: 'Okur katkısı', google_books: 'Google Books', open_library: 'Open Library', publisher_feed: 'Yayınevi',
};

export function EditionsSection({ mediaId, title }: { mediaId: string; title: string }) {
  const eds = useEditions(mediaId);
  const setMine = useSetMyEdition(mediaId);
  const cover = useSubmitCover(mediaId);

  const askCover = (e: Edition) => {
    const go = (source: 'camera' | 'library') => cover.mutate({ editionId: e.id, source }, {
      onSuccess: (p) => { if (p) Alert.alert('Teşekkürler', 'Kapak önerin moderatör onayından sonra görünecek.'); },
      onError: (err) => Alert.alert('Yüklenemedi', errorMessage(err)),
    });
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: ['Vazgeç', 'Fotoğraf çek', 'Galeriden seç'], cancelButtonIndex: 0 },
        (i) => { if (i === 1) go('camera'); if (i === 2) go('library'); });
    } else {
      Alert.alert('Kapak ekle', undefined, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Fotoğraf çek', onPress: () => go('camera') }, { text: 'Galeriden seç', onPress: () => go('library') }]);
    }
  };

  const list = eds.data ?? [];
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Overline>{`Baskılar (${list.length})`}</Overline>
        <Pressable onPress={() => router.push({ pathname: '/edition/new', params: { mediaId, title } })} accessibilityRole="button" hitSlop={10}>
          <T v="label" c={color.primary}>+ Baskı ekle</T>
        </Pressable>
      </View>
      {list.length === 0 && !eds.isLoading ? (
        <T v="bodySm" c={color.textMuted} style={{ marginTop: space[2] }}>Henüz baskı bilgisi yok. Elindeki kitabın yayınevini ve kapağını ekleyerek kataloğu büyüt.</T>
      ) : null}
      {list.map((e) => (
        <View key={e.id} style={{ flexDirection: 'row', gap: space[3], paddingVertical: space[3], borderBottomWidth: 1, borderBottomColor: color.border,
          ...(e.is_mine ? { backgroundColor: 'rgba(0,229,160,0.06)', borderRadius: radius.md, paddingHorizontal: space[2] } : null) }}>
          <Cover id={e.id} path={e.cover_path} width={52} />
          <View style={{ flex: 1, gap: 2 }}>
            {e.publisher_id ? (
              <Pressable onPress={() => router.push(`/publisher/${e.publisher_id}`)} accessibilityRole="link">
                <T v="label" c={color.accent}>{e.publisher}</T>
              </Pressable>
            ) : <T v="label">Yayınevi bilinmiyor</T>}
            <T v="caption" c={color.textMuted}>{[e.edition_year, e.page_count ? `${e.page_count} sayfa` : null, e.translator ? `Çev. ${e.translator}` : null].filter(Boolean).join(' · ')}</T>
            {e.isbn13 ? <T v="caption" c={color.textFaint}>ISBN {e.isbn13}</T> : null}
            <T v="caption" c={color.textFaint}>{e.reader_count} okur · {SOURCE[e.source]}{e.pending ? ' · onay bekliyor' : ''}</T>
            <View style={{ flexDirection: 'row', gap: space[2], marginTop: 6 }}>
              <Pressable onPress={() => setMine.mutate(e.is_mine ? null : e.id, { onError: (err) => Alert.alert('Kaydedilemedi', errorMessage(err)) })}
                accessibilityRole="button" accessibilityState={{ selected: e.is_mine }}
                style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, justifyContent: 'center',
                  borderColor: e.is_mine ? color.primary : color.borderStrong, backgroundColor: e.is_mine ? 'rgba(0,229,160,0.1)' : 'transparent' }}>
                <T v="caption" c={e.is_mine ? color.primary : color.text}>{e.is_mine ? '✓ Benim baskım' : 'Bu baskıyı okudum'}</T>
              </Pressable>
              <Pressable onPress={() => askCover(e)} accessibilityRole="button" disabled={cover.isPending}
                style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: color.borderStrong, justifyContent: 'center' }}>
                <T v="caption">{e.cover_path ? 'Kapak öner' : '+ Kapak ekle'}</T>
              </Pressable>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
