import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconBack } from '../../src/components/icons';
import { Avatar, Button, EmptyState, T } from '../../src/components/ui';
import { useUserId } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';
import { color, space } from '../../src/theme/tokens';

export default function Blocked() {
  const uid = useUserId();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['blocked', uid],
    queryFn: async () => {
      const { data, error } = await supabase.from('blocks')
        .select('blocked_id, created_at, user:profiles!blocks_blocked_id_fkey(id, username, display_name, avatar_path)').eq('blocker_id', uid!);
      if (error) throw error;
      return data as unknown as { blocked_id: string; user: { id: string; username: string; display_name: string | null; avatar_path: string | null } }[];
    },
  });
  const unblock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blocks').delete().eq('blocker_id', uid!).eq('blocked_id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: space[2] }}><IconBack /></Pressable>
      <T v="displayLg" style={{ paddingHorizontal: space[4] }}>Engellenenler</T>
      <FlatList
        data={list.data ?? []}
        keyExtractor={(b) => b.blocked_id}
        contentContainerStyle={{ padding: space[4] }}
        ListEmptyComponent={<EmptyState title="Engellediğin kimse yok" />}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 64 }}>
            <Avatar name={item.user?.display_name ?? item.user?.username} path={item.user?.avatar_path} size={40} />
            <T v="label" style={{ flex: 1 }}>@{item.user?.username}</T>
            <Button title="Engeli kaldır" kind="secondary" onPress={() => unblock.mutate(item.blocked_id)} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
