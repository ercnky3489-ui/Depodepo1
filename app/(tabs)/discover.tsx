// Keşfet: kişisel öneriler, haftanın içerikleri, trendler, benzer zevkler, listeler.
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFollow, usePopularLists, useRecommendations, useSimilarUsers, useTopQuotes, useTopReviews, useTrending } from '../../src/api/social';
import { IconSearch } from '../../src/components/icons';
import { Avatar, Button, Card, Cover, SectionHeader, T } from '../../src/components/ui';
import { formatNumber, formatRating } from '../../src/lib/format';
import { color, radius, space } from '../../src/theme/tokens';

export default function Discover() {
  const books = useRecommendations('book');
  const films = useRecommendations('movie');
  const reviews = useTopReviews();
  const quotes = useTopQuotes();
  const trendBooks = useTrending('book');
  const trendSeries = useTrending('series');
  const people = useSimilarUsers();
  const lists = usePopularLists();
  const refreshing = books.isRefetching || trendBooks.isRefetching;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={color.primary}
          onRefresh={() => [books, films, reviews, quotes, trendBooks, trendSeries, people, lists].forEach((q) => q.refetch())} />}>
        <View style={{ padding: space[4], paddingBottom: 0 }}>
          <T v="displayLg" accessibilityRole="header">Keşfet</T>
          <Pressable onPress={() => router.push('/search')} accessibilityRole="search"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, marginTop: 14, paddingHorizontal: space[4], borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.borderStrong }}>
            <IconSearch size={20} c={color.primary} />
            <T v="bodySm" c={color.textMuted}>Kitap, yazar, film, dizi veya kişi ara</T>
          </Pressable>
        </View>

        <Section title="Sana özel kitaplar" subtitle="Zevkine benzeyen okurların sevdikleri">
          <HRow data={books.data ?? []} render={(b) => (
            <Pressable style={{ width: 144 }} onPress={() => router.push(`/media/${b.id}`)} accessibilityRole="link" accessibilityLabel={b.title}>
              <Cover id={b.id} path={b.cover_path} title={b.title} width={144} radius={10} shadow />
              {b.match ? <View style={matchTag}><T v="overline" c={color.primary}>%{b.match} EŞLEŞME</T></View> : null}
              <T v="label" numberOfLines={1} style={{ marginTop: 10 }}>{b.title}</T>
              <T v="caption" c={color.textMuted} numberOfLines={1}>{b.reason}</T>
            </Pressable>
          )} />
        </Section>

        <Section title="Sana özel filmler" subtitle="Puanlarına göre seçildi">
          <HRow data={films.data ?? []} render={(f) => (
            <Pressable style={{ width: 124 }} onPress={() => router.push(`/media/${f.id}`)} accessibilityRole="link" accessibilityLabel={f.title}>
              <Cover id={f.id} path={f.cover_path} title={f.title} width={124} radius={10} shadow />
              <T v="label" numberOfLines={1} style={{ marginTop: 10 }}>{f.title}</T>
              {f.year ? <T v="caption" c={color.textMuted}>{f.year}</T> : null}
            </Pressable>
          )} />
        </Section>

        <Section title="Haftanın en iyi incelemeleri" subtitle="En çok faydalı oy alanlar">
          <View style={{ paddingHorizontal: space[4], gap: 10 }}>
            {(reviews.data ?? []).map((r: any, i: number) => (
              <Pressable key={r.id} onPress={() => router.push(`/review/${r.id}`)} accessibilityRole="link">
                <Card style={{ flexDirection: 'row', gap: 14 }}>
                  <T style={{ fontFamily: 'Fraunces_700Bold', fontSize: 40, lineHeight: 42, width: 28 }} c={i === 0 ? color.primary : i === 1 ? color.accent : color.textFaint}>{i + 1}</T>
                  <View style={{ flex: 1 }}>
                    <T v="overline" c={color.accent}>{`${r.media?.title ?? ''}`.toLocaleUpperCase('tr-TR')}</T>
                    <T v="titleSm" style={{ marginTop: 4 }}>{r.title ?? 'İnceleme'}</T>
                    <T v="bodySm" c={color.textSoft} numberOfLines={2} style={{ marginTop: 4 }}>{r.has_spoiler ? 'Spoiler içeriyor.' : r.body}</T>
                    <T v="caption" c={color.textMuted} style={{ marginTop: 6 }}>{r.author?.display_name ?? r.author?.username} · <T v="caption" c={color.primary}>{r.helpful_count}</T> faydalı · {r.rating}/10</T>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="En çok paylaşılan alıntılar" subtitle="Bu hafta en çok beğenilen ve kaydedilenler">
          <HRow data={quotes.data ?? []} render={(q: any) => (
            <Pressable onPress={() => router.push(`/quote/${q.id}`)} accessibilityRole="link">
              <Card style={{ width: 260, minHeight: 170, justifyContent: 'space-between' }}>
                <T v="quoteMd" style={{ fontStyle: 'normal', fontFamily: 'Fraunces_400Regular' }} numberOfLines={5}>“{q.body}”</T>
                <T v="caption" c={color.textMuted} style={{ marginTop: 12 }}>{q.media?.title}{q.page_number && !q.hide_page ? ` · s. ${q.page_number}` : ''} · <T v="caption" c={color.primary}>{q.like_count} beğeni</T></T>
              </Card>
            </Pressable>
          )} />
        </Section>

        <Section title="Trend kitaplar" subtitle="Son 7 günde en çok okunmaya başlananlar">
          <View style={{ paddingHorizontal: space[4] }}>
            {(trendBooks.data ?? []).slice(0, 5).map((b, i) => (
              <Pressable key={b.id} onPress={() => router.push(`/media/${b.id}`)} accessibilityRole="link"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68, borderBottomWidth: 1, borderBottomColor: color.border }}>
                <T style={{ width: 22, fontFamily: 'Inter_800ExtraBold', fontSize: 18 }} c={i === 0 ? color.primary : color.text}>{i + 1}</T>
                <Cover id={b.id} path={b.cover_path} width={36} radius={4} />
                <View style={{ flex: 1 }}>
                  <T v="label" style={{ fontSize: 14 }}>{b.title}</T>
                  <T v="caption" c={color.textMuted}>{formatNumber(b.activity_count)} etkinlik{b.app_rating ? ` · ${formatRating(b.app_rating)}/10` : ''}</T>
                </View>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Trend diziler" subtitle="Bu hafta en çok bölüm işaretlenenler">
          <HRow data={trendSeries.data ?? []} render={(s) => (
            <Pressable style={{ width: 120 }} onPress={() => router.push(`/media/${s.id}`)} accessibilityRole="link" accessibilityLabel={s.title}>
              <Cover id={s.id} path={s.cover_path} title={s.title} width={120} radius={10} shadow />
              <T v="caption" c={color.textMuted} style={{ marginTop: 8 }}>{formatNumber(s.activity_count)} izleme</T>
            </Pressable>
          )} />
        </Section>

        <Section title="Senin gibi okuyanlar" subtitle="Puanlarının en çok örtüştüğü kullanıcılar">
          <HRow data={people.data ?? []} render={(p) => <PersonCard p={p} />} />
        </Section>

        <Section title="Popüler listeler" subtitle="Kullanıcıların derlediği koleksiyonlar">
          <View style={{ paddingHorizontal: space[4], flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(lists.data ?? []).map((l: any) => (
              <Pressable key={l.id} style={{ width: '48%' }} onPress={() => router.push(`/list/${l.id}`)} accessibilityRole="link">
                <Card style={{ padding: 14 }}>
                  <View style={{ flexDirection: 'row', height: 92, alignItems: 'center' }}>
                    {[...(l.list_items ?? [])].sort((a: any, b: any) => a.position - b.position).slice(0, 3).map((it: any, i: number) => (
                      <View key={i} style={{ marginLeft: i ? -18 : 0, transform: [{ rotate: `${[-7, 0, 7][i]}deg` }] }}>
                        <Cover id={it.media?.id ?? `${l.id}${i}`} path={it.media?.cover_path} width={50} shadow />
                      </View>
                    ))}
                  </View>
                  <T v="titleSm" style={{ fontSize: 15, marginTop: 8 }} numberOfLines={2}>{l.title}</T>
                  <T v="caption" c={color.textMuted} style={{ marginTop: 4 }}>{l.owner?.display_name ?? l.owner?.username} · {l.item_count} eser</T>
                </Card>
              </Pressable>
            ))}
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <View style={{ marginTop: 26, gap: 14 }}><SectionHeader title={title} subtitle={subtitle} />{children}</View>;
}

function HRow<T extends { id: string }>({ data, render }: { data: T[]; render: (item: T) => React.ReactElement }) {
  if (!data.length) return <T2>Henüz yeterli veri yok; birkaç eser puanladıkça burası dolacak.</T2>;
  return (
    <FlatList horizontal data={data} keyExtractor={(d) => d.id} renderItem={({ item }) => render(item)} showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: space[4], gap: space[3] }} />
  );
}

const T2 = ({ children }: { children: string }) => <T v="caption" c={color.textMuted} style={{ paddingHorizontal: space[4] }}>{children}</T>;

function PersonCard({ p }: { p: { id: string; username: string; display_name: string | null; avatar_path: string | null; match: number; common_count: number; is_following: boolean } }) {
  const follow = useFollow(p.id);
  return (
    <Card style={{ width: 200, alignItems: 'center' }}>
      <Pressable onPress={() => router.push(`/user/${p.id}`)} accessibilityRole="link" style={{ alignItems: 'center' }}>
        <Avatar name={p.display_name ?? p.username} path={p.avatar_path} size={60} ring />
        <T v="label" style={{ marginTop: 10, fontSize: 14 }}>{p.display_name ?? p.username}</T>
        <T v="caption" c={color.primary} style={{ fontFamily: 'Inter_700Bold' }}>%{p.match} zevk uyumu</T>
        <T v="caption" c={color.textMuted} style={{ marginTop: 4 }}>{p.common_count} ortak eser</T>
      </Pressable>
      <Button title={p.is_following ? 'Takip ediliyor' : 'Takip et'} kind={p.is_following ? 'tonal' : 'primary'}
        onPress={() => follow.mutate(p.is_following)} loading={follow.isPending} style={{ alignSelf: 'stretch', marginTop: 12 }} />
    </Card>
  );
}

const matchTag = { position: 'absolute', left: 8, top: 176, height: 22, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: 'rgba(8,11,10,0.85)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.45)', justifyContent: 'center' } as const;
