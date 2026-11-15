// Kurulum 2/2: zevk seçimi. En az 3 eser işaretlenince akış ve öneriler kişiselleşir.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCatalogSearch } from '../src/api/social';
import { IconCheck } from '../src/components/icons';
import { Button, Cover, T } from '../src/components/ui';
import { useUserId } from '../src/lib/auth';
import { haptic } from '../src/lib/haptics';
import { supabase } from '../src/lib/supabase';
import { color, space } from '../src/theme/tokens';
import { inputStyle } from '../src/theme/inputs';

type Item = { id: string; title: string; cover_path: string | null; kind: string };

export default function Taste() {
  const uid = useUserId();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Record<string, Item>>({});
  const [busy, setBusy] = useState(false);

  const popular = useQuery({
    queryKey: ['popularForOnboarding'],
    queryFn: async () => {
      const { data, error } = await supabase.from('media_items')
        .select('id, title, cover_path, kind, media_stats!inner(reader_count)')
        .eq('moderation_status', 'visible').order('reader_count', { referencedTable: 'media_stats', ascending: false }).limit(30);
      if (error) throw error;
      return data as unknown as Item[];
    },
  });
  const search = useCatalogSearch(q, null);
  const items: Item[] = q.trim().length >= 2 ? (search.data ?? []) : (popular.data ?? []);
  const count = Object.keys(picked).length;

  const finish = async () => {
    setBusy(true);
    const rows = Object.values(picked).map((m) => ({ user_id: uid!, media_id: m.id, status: 'completed' as const }));
    if (rows.length) await supabase.from('library_entries').upsert(rows, { onConflict: 'user_id,media_id', ignoreDuplicates: true });
    setBusy(false);
    qc.invalidateQueries();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ padding: space[4], gap: space[3] }}>
        <T v="overline" c={color.primary}>2 / 2</T>
        <T v="displayLg">Neleri sevdin?</T>
        <T v="body" c={color.textMuted}>Okuduğun veya izlediğin en az 3 eseri seç. Önerilerin buna göre şekillenir.</T>
        <TextInput value={q} onChangeText={setQ} placeholder="Kitap, film veya dizi ara" placeholderTextColor={color.textFaint}
          accessibilityLabel="Eser ara" style={inputStyle} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(m) => m.id}
        numColumns={3}
        contentContainerStyle={{ paddingHorizontal: space[3], paddingBottom: 120 }}
        columnWrapperStyle={{ gap: space[3] }}
        renderItem={({ item }) => {
          const on = !!picked[item.id];
          return (
            <Pressable style={{ flex: 1 / 3, marginBottom: space[4] }} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={item.title}
              onPress={() => {
                haptic.select();
                setPicked((p) => { const n = { ...p }; if (on) delete n[item.id]; else n[item.id] = item; return n; });
              }}>
              <View style={{ borderRadius: 8, borderWidth: 2, borderColor: on ? color.primary : 'transparent' }}>
                <Cover id={item.id} path={item.cover_path} title={item.title} width={104} />
                {on ? <View style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' }}><IconCheck size={14} /></View> : null}
              </View>
              <T v="caption" numberOfLines={2} style={{ marginTop: 6 }}>{item.title}</T>
            </Pressable>
          );
        }}
      />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space[4], paddingBottom: space[8], backgroundColor: 'rgba(8,11,10,0.94)' }}>
        <Button title={count >= 3 ? `Bitir (${count} seçildi)` : `En az ${3 - count} eser daha seç`} onPress={finish} disabled={count < 3} loading={busy} />
        <Button title="Şimdilik atla" kind="ghost" onPress={finish} />
      </View>
    </SafeAreaView>
  );
}
