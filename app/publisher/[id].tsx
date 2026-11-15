import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePublisher } from '../../src/api/editions';
import { IconBack } from '../../src/components/icons';
import { Cover, EmptyState, Loading, Overline, T } from '../../src/components/ui';
import { color, space } from '../../src/theme/tokens';

export default function PublisherScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = usePublisher(id);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: space[2] }}><IconBack /></Pressable>
      {q.isLoading || !q.data ? <Loading /> : (
        <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }}>
          <View>
            <Overline c={color.accent}>YAYINEVİ</Overline>
            <T v="displayLg" accessibilityRole="header" style={{ marginTop: 4 }}>{q.data.publisher.name}{q.data.publisher.verified ? ' ✓' : ''}</T>
            <T v="bodySm" c={color.textMuted}>{q.data.books.length} kitap</T>
          </View>
          {q.data.books.length === 0 ? <EmptyState title="Henüz kitap yok" body="Bu yayınevine ait onaylı baskı bulunmuyor." /> : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
              {q.data.books.map((b) => (
                <Pressable key={b.media_id} onPress={() => router.push(`/media/${b.media_id}`)} accessibilityRole="button" accessibilityLabel={b.title} style={{ width: '30%', gap: 6 }}>
                  <Cover id={b.media_id} path={b.cover_path} title={b.title} width={100} />
                  <T v="caption" numberOfLines={2}>{b.title}</T>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
