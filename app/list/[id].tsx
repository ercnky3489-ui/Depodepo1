import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconBack } from '../../src/components/icons';
import { Avatar, Button, Cover, EmptyState, Loading, T } from '../../src/components/ui';
import { useUserId } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';
import { color, space } from '../../src/theme/tokens';

export default function ListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useUserId();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['list', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('lists')
        .select('*, owner:profiles!lists_owner_id_fkey(id, username, display_name, avatar_path), list_items(position, note, media:media_items(id, title, kind, cover_path, year))')
        .eq('id', id).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
  const removeItem = useMutation({
    mutationFn: async (mediaId: string) => {
      const { error } = await supabase.from('list_items').delete().eq('list_id', id).eq('media_id', mediaId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['list', id] }),
  });

  if (list.isLoading) return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><Loading /></SafeAreaView>;
  const l = list.data;
  if (!l) return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><EmptyState title="Liste bulunamadı" /></SafeAreaView>;
  const mine = l.owner_id === uid;
  const items = [...(l.list_items ?? [])].sort((a: any, b: any) => a.position - b.position);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: space[2] }}><IconBack /></Pressable>
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }}>
        <T v="displayLg">{l.title}</T>
        {l.description ? <T v="body" c={color.textSoft}>{l.description}</T> : null}
        <Pressable onPress={() => router.push(`/user/${l.owner.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityRole="link">
          <Avatar name={l.owner.display_name ?? l.owner.username} path={l.owner.avatar_path} size={26} />
          <T v="caption" c={color.textMuted}>{l.owner.display_name ?? l.owner.username} · {l.item_count} eser · {l.like_count} beğeni</T>
        </Pressable>
        {mine ? <Button title="Eser ekle" kind="tonal" onPress={() => router.push({ pathname: '/compose/pick', params: { next: 'list', listId: id } })} /> : null}
        {!items.length ? <EmptyState title="Liste boş" /> : null}
        {items.map((it: any, i: number) => (
          <Pressable key={it.media.id} onPress={() => router.push(`/media/${it.media.id}`)} accessibilityRole="link"
            onLongPress={() => mine && Alert.alert('Listeden çıkar', it.media.title, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Çıkar', style: 'destructive', onPress: () => removeItem.mutate(it.media.id) }])}
            style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
            <T v="statMd" c={color.textFaint} style={{ width: 28, fontSize: 18 }}>{i + 1}</T>
            <Cover id={it.media.id} path={it.media.cover_path} width={48} />
            <View style={{ flex: 1 }}>
              <T v="titleSm">{it.media.title}</T>
              <T v="caption" c={color.textMuted}>{it.media.kind === 'book' ? 'Kitap' : it.media.kind === 'movie' ? 'Film' : 'Dizi'}{it.media.year ? ` · ${it.media.year}` : ''}</T>
              {it.note ? <T v="caption" c={color.textSoft} style={{ marginTop: 2 }}>{it.note}</T> : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
