import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { Avatar, Button, T } from '../../components/ui';
import { useUserId } from '../../lib/auth';
import { relativeTime } from '../../lib/format';
import { errorMessage, supabase } from '../../lib/supabase';
import { color, space } from '../../theme/tokens';
import { inputStyle } from '../../theme/inputs';
import type { TargetType } from '../../types/db';

interface CommentRow {
  id: string; user_id: string; body: string; created_at: string;
  author: { id: string; username: string | null; display_name: string | null; avatar_path: string | null };
}

export function Comments({ type, id, ownerId }: { type: TargetType; id: string; ownerId: string }) {
  const uid = useUserId();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const list = useQuery({
    queryKey: ['comments', type, id],
    queryFn: async () => {
      const { data, error } = await supabase.from('comments')
        .select('id, user_id, body, created_at, author:profiles!comments_user_id_fkey(id, username, display_name, avatar_path)')
        .eq('target_type', type).eq('target_id', id).eq('status', 'visible').order('created_at');
      if (error) throw error;
      return data as unknown as CommentRow[];
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('comments').insert({ user_id: uid!, target_type: type, target_id: id, body: text.trim() });
      if (error) throw error;
    },
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['comments', type, id] }); qc.invalidateQueries({ queryKey: ['feed'] }); },
    onError: (e) => Alert.alert('Yorum gönderilemedi', errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: async (cid: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', cid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', type, id] }),
  });

  return (
    <View style={{ gap: space[3] }}>
      <T v="overline" c={color.textMuted}>{`YORUMLAR · ${list.data?.length ?? 0}`}</T>
      {list.data?.map((c) => (
        <Pressable key={c.id} onLongPress={() => {
          if (c.user_id !== uid && ownerId !== uid) return;
          Alert.alert('Yorumu sil', 'Bu yorum kalıcı olarak silinsin mi?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => remove.mutate(c.id) }]);
        }} style={{ flexDirection: 'row', gap: space[3] }}>
          <Pressable onPress={() => router.push(`/user/${c.author.id}`)} accessibilityRole="link" accessibilityLabel={`${c.author.display_name ?? c.author.username} profili`}>
            <Avatar name={c.author.display_name ?? c.author.username} path={c.author.avatar_path} size={32} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <T v="caption" c={color.textMuted}><T v="label">{c.author.display_name ?? c.author.username}</T> · {relativeTime(c.created_at)}</T>
            <T v="bodySm" style={{ marginTop: 2 }}>{c.body}</T>
          </View>
        </Pressable>
      ))}
      <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'flex-end' }}>
        <TextInput value={text} onChangeText={setText} maxLength={2000} multiline placeholder="Yorum yaz…" placeholderTextColor={color.textFaint}
          accessibilityLabel="Yorum" style={[inputStyle, { flex: 1, minHeight: 48, height: undefined, maxHeight: 120, paddingTop: 13 }]} />
        <Button title="Gönder" onPress={() => add.mutate()} disabled={!text.trim()} loading={add.isPending} />
      </View>
    </View>
  );
}
