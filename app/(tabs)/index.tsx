// Ana Sayfa: takip edilenlerin aktiviteleri, filtreler, sonsuz kaydırma.
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFeed } from '../../src/api/feed';
import { useUnreadCount } from '../../src/api/social';
import { ActivityCard } from '../../src/components/ActivityCard';
import { IconBell, IconSearch } from '../../src/components/icons';
import { Avatar, ChipRow, EmptyState, Loading, T } from '../../src/components/ui';
import { FEED_FILTERS, type FeedFilter } from '../../src/features/feed/filters';
import { useAuth } from '../../src/lib/auth';
import { color, space } from '../../src/theme/tokens';

export default function Home() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const feed = useFeed(filter);
  const unread = useUnreadCount().data ?? 0;
  const items = feed.data?.pages.flat() ?? [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 18, paddingRight: space[3], paddingTop: space[2] }}>
        <T accessibilityRole="header" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 23, letterSpacing: -0.7 }}>
          BOOK<T c={color.primary} style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 23, letterSpacing: -0.7, textShadowColor: 'rgba(0,229,160,0.55)', textShadowRadius: 14 }}>FLIX</T>
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.push('/search')} accessibilityRole="button" accessibilityLabel="Ara" style={iconBtn}><IconSearch /></Pressable>
          <Pressable onPress={() => router.push('/(tabs)/notifications')} accessibilityRole="button"
            accessibilityLabel={unread ? `Bildirimler, ${unread} yeni` : 'Bildirimler'} style={iconBtn}>
            <IconBell />
            {unread ? <View style={{ position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: color.primary }} /> : null}
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/profile')} accessibilityRole="button" accessibilityLabel="Profilim" style={iconBtn}>
            <Avatar name={profile?.display_name ?? profile?.username} path={profile?.avatar_path} size={34} ring />
          </Pressable>
        </View>
      </View>
      <ChipRow items={FEED_FILTERS} value={filter} onChange={setFilter} />
      <FlashList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <View style={{ paddingHorizontal: space[3], paddingBottom: 14 }}><ActivityCard item={item} /></View>}
        getItemType={(it) => it.verb}
        onEndReached={() => { if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage(); }}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={() => feed.refetch()} tintColor={color.primary} />}
        ListHeaderComponent={<View style={{ height: space[1] }} />}
        ListFooterComponent={feed.isFetchingNextPage ? <Loading /> : <View style={{ height: 40 }} />}
        ListEmptyComponent={feed.isLoading ? <Loading /> : (
          <EmptyState
            title={filter === 'all' ? 'Akışın henüz sessiz' : 'Bu filtrede etkinlik yok'}
            body="Zevkine yakın okurları ve izleyicileri takip et; paylaşımları burada görünsün."
            action="Kişileri keşfet"
            onAction={() => router.push('/(tabs)/discover')}
          />
        )}
      />
    </SafeAreaView>
  );
}

const iconBtn = { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' } as const;
