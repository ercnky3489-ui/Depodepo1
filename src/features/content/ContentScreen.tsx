// Tek alıntı veya inceleme sayfası: içerik, eylemler, sahip menüsü, şikayet ve yorumlar.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { REPORT_REASONS, useDeleteContent, useReport } from '../../api/content';
import { useToggleHelpful } from '../../api/feed';
import { IconBack, IconHeart, IconMore, IconThumb } from '../../components/icons';
import { Stars } from '../../components/Ratings';
import { SpoilerVeil } from '../../components/SpoilerVeil';
import { Avatar, Card, Cover, EmptyState, Loading, T } from '../../components/ui';
import { useUserId } from '../../lib/auth';
import { relativeTime } from '../../lib/format';
import { haptic } from '../../lib/haptics';
import { supabase } from '../../lib/supabase';
import { color, space } from '../../theme/tokens';
import { Comments } from '../comments/Comments';

export function ContentScreen({ kind, id }: { kind: 'quote' | 'review'; id: string }) {
  const uid = useUserId();
  const qc = useQueryClient();
  const del = useDeleteContent();
  const report = useReport();
  const helpful = useToggleHelpful();
  const table = kind === 'quote' ? 'quotes' : 'reviews';
  const q = useQuery({
    queryKey: [kind, id],
    queryFn: async () => {
      const { data, error } = await supabase.from(table)
        .select(`*, media:media_items(id, title, kind, cover_path, year), author:profiles!${table}_user_id_fkey(id, username, display_name, avatar_path)`)
        .eq('id', id).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
  const liked = useQuery({
    queryKey: ['likes', id],
    enabled: !!uid,
    queryFn: async () => {
      const { count } = await supabase.from('likes').select('id', { count: 'exact', head: true }).eq('user_id', uid!).eq('target_type', kind).eq('target_id', id);
      return (count ?? 0) > 0;
    },
  });

  if (q.isLoading) return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><Loading /></SafeAreaView>;
  const c = q.data;
  if (!c) return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><EmptyState title="Bu içerik artık görünmüyor" body="Silinmiş, gizlenmiş veya erişimin olmayabilir." /></SafeAreaView>;
  const mine = c.user_id === uid;
  const isBook = c.media?.kind === 'book';

  const toggleLike = async () => {
    haptic.like();
    const { error } = await supabase.rpc('toggle_like', { p_type: kind, p_id: id });
    if (error) haptic.error();
    qc.invalidateQueries({ queryKey: [kind, id] });
    qc.invalidateQueries({ queryKey: ['likes', id] });
    qc.invalidateQueries({ queryKey: ['feed'] });
  };

  const menu = () => {
    if (mine) {
      Alert.alert(kind === 'quote' ? 'Alıntı' : 'İnceleme', undefined, [
        { text: 'Sil', style: 'destructive', onPress: () => Alert.alert('Silinsin mi?', 'Kazandığın XP de geri alınır.', [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Sil', style: 'destructive', onPress: () => del.mutate({ table, id }, { onSuccess: () => router.back() }) },
        ]) },
        { text: 'Vazgeç', style: 'cancel' },
      ]);
      return;
    }
    Alert.alert('Şikayet nedeni', undefined, [
      ...REPORT_REASONS.map((r) => ({ text: r.label, onPress: () => report.mutate({ target_type: kind, target_id: id, reason: r.id }, { onSuccess: () => Alert.alert('Teşekkürler', 'Şikayetin moderasyon ekibine iletildi.') }) })),
      { text: 'Vazgeç', style: 'cancel' as const },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space[2] }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><IconBack /></Pressable>
        <Pressable onPress={menu} accessibilityRole="button" accessibilityLabel={mine ? 'Seçenekler' : 'Şikayet et'} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><IconMore c={color.text} /></Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space[4], gap: space[6] }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.push(`/user/${c.author.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityRole="link">
            <Avatar name={c.author.display_name ?? c.author.username} path={c.author.avatar_path} size={40} />
            <View><T v="label" style={{ fontSize: 15 }}>{c.author.display_name ?? c.author.username}</T><T v="caption" c={color.textMuted}>{relativeTime(c.created_at)}</T></View>
          </Pressable>

          {kind === 'review' ? (
            <View>
              {c.title ? <T v="titleLg">{c.title}</T> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}><T v="label" c={color.primary}>{c.rating}/10</T><Stars rating10={c.rating} /></View>
              {c.has_spoiler ? <SpoilerVeil text={c.body} /> : <T v="body" c="#D5DED9" style={{ marginTop: space[3] }}>{c.body}</T>}
            </View>
          ) : c.has_spoiler ? <SpoilerVeil text={c.body} /> : (
            <T v={isBook ? 'quoteLg' : 'quoteMd'} style={!isBook ? { borderLeftWidth: 2, borderLeftColor: color.accent, paddingLeft: 12 } : undefined}>{isBook ? `“${c.body}”` : c.body}</T>
          )}

          <Pressable onPress={() => router.push(`/media/${c.media.id}`)} accessibilityRole="link">
            <Card style={{ flexDirection: 'row', gap: space[3], alignItems: 'center', backgroundColor: color.surfaceSunken }}>
              <Cover id={c.media.id} path={c.media.cover_path} width={40} />
              <View style={{ flex: 1 }}>
                <T v="label">{c.media.title}</T>
                <T v="caption" c={color.textMuted}>{kind === 'quote' ? (isBook ? (c.page_number && !c.hide_page ? `Sayfa ${c.page_number}` : 'Sayfa gizli') : c.scene_note ?? '') : c.media.year ?? ''}</T>
              </View>
            </Card>
          </Pressable>

          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <Pressable onPress={toggleLike} accessibilityRole="button" accessibilityState={{ selected: !!liked.data }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingRight: space[3] }}>
              <IconHeart fill={liked.data ? color.primary : 'none'} c={liked.data ? color.primary : color.textMuted} />
              <T v="label" c={liked.data ? color.primary : color.textMuted}>{c.like_count}</T>
            </Pressable>
            {kind === 'review' && !mine ? (
              <Pressable onPress={() => helpful.mutate(id, { onSettled: () => qc.invalidateQueries({ queryKey: [kind, id] }) })} accessibilityRole="button"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
                <IconThumb /><T v="label" c={color.textMuted}>Faydalı · {c.helpful_count}</T>
              </Pressable>
            ) : null}
          </View>

          <Comments type={kind} id={id} ownerId={c.user_id} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
