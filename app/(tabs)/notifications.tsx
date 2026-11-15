import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAnswerFollowRequest, useMarkAllRead, useNotifications } from '../../src/api/social';
import { Avatar, Button, EmptyState, Loading, T } from '../../src/components/ui';
import { relativeTime } from '../../src/lib/format';
import { color, space } from '../../src/theme/tokens';
import type { NotificationRow } from '../../src/types/db';

const BADGES: Record<string, string> = {
  book_worm: 'Kitap Kurdu', long_reader: 'Uzun Okur', film_buff: 'Film Tutkunu', series_lover: 'Dizi Sever',
  quote_master: 'Alıntı Ustası', master_reviewer: 'Usta Yorumcu', film_critic: 'Film Eleştirmeni',
};
const TIERS = ['', 'Bronz', 'Gümüş', 'Altın'];
const ACC: Record<string, string> = { quote: 'alıntını', review: 'incelemeni', list: 'listeni', comment: 'yorumunu', community_post: 'paylaşımını' };
const DAT: Record<string, string> = { quote: 'alıntına', review: 'incelemene', list: 'listene', comment: 'yorumuna', community_post: 'paylaşımına' };

function text(n: NotificationRow): string {
  const t = n.target_type ?? '';
  switch (n.type) {
    case 'follow': return 'seni takip etmeye başladı';
    case 'follow_request': return 'seni takip etmek istiyor';
    case 'follow_accepted': return 'takip isteğini kabul etti';
    case 'like': return `${ACC[t] ?? 'paylaşımını'} beğendi`;
    case 'comment': return `${DAT[t] ?? 'paylaşımına'} yorum yaptı`;
    case 'helpful': return 'incelemeni faydalı buldu · +3 XP';
    case 'badge': return `Yeni rozet: ${BADGES[String(n.data.code)] ?? ''} · ${TIERS[Number(n.data.tier)] ?? ''}`;
    case 'level_up': return `Seviye ${n.data.level} oldun`;
    case 'moderation': return 'Paylaşımlarından biri hakkında topluluk kuralları kararı verildi';
    default: return '';
  }
}

function target(n: NotificationRow): string | null {
  if (n.type === 'badge' || n.type === 'level_up') return '/(tabs)/profile';
  if (n.target_type === 'profile' && n.target_id) return `/user/${n.target_id}`;
  if (n.target_type && n.target_id && ['quote', 'review', 'list'].includes(n.target_type)) return `/${n.target_type}/${n.target_id}`;
  return null;
}

export default function Notifications() {
  const list = useNotifications();
  const markAll = useMarkAllRead();
  const answer = useAnswerFollowRequest();

  useFocusEffect(useCallback(() => {
    const t = setTimeout(() => markAll.mutate(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.bg }}>
      <T v="displayLg" accessibilityRole="header" style={{ padding: space[4] }}>Bildirimler</T>
      <FlatList
        data={list.data ?? []}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => list.refetch()} tintColor={color.primary} />}
        ListEmptyComponent={list.isLoading ? <Loading /> : <EmptyState title="Henüz bildirim yok" body="Beğeniler, yorumlar, yeni takipçiler ve kazandığın rozetler burada görünür." />}
        renderItem={({ item: n }) => {
          const name = n.actor?.display_name ?? n.actor?.username ?? 'BOOKFLIX';
          const href = target(n);
          return (
            <Pressable onPress={() => href && router.push(href as never)} accessibilityRole={href ? 'link' : undefined}
              style={{ flexDirection: 'row', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3], backgroundColor: n.read_at ? 'transparent' : 'rgba(0,229,160,0.04)' }}>
              <Avatar name={name} path={n.actor?.avatar_path} size={40} ring={!n.actor} />
              <View style={{ flex: 1 }}>
                <T v="bodySm"><T v="label" style={{ fontSize: 14 }}>{n.actor ? name : ''}</T>{n.actor ? ' ' : ''}{text(n)}</T>
                <T v="caption" c={color.textMuted} style={{ marginTop: 2 }}>{relativeTime(n.created_at)}</T>
                {n.type === 'follow_request' && n.actor ? (
                  <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[2] }}>
                    <Button title="Onayla" onPress={() => answer.mutate({ followerId: n.actor!.id, accept: true })} style={{ minHeight: 36 }} />
                    <Button title="Reddet" kind="secondary" onPress={() => answer.mutate({ followerId: n.actor!.id, accept: false })} style={{ minHeight: 36 }} />
                  </View>
                ) : null}
              </View>
              {!n.read_at ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color.primary, marginTop: 6 }} accessibilityLabel="Okunmadı" /> : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
