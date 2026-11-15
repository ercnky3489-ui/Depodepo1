// Profil: kimlik, XP ve seviye, başarılar (rozetler), istatistikler, en faydalı incelemeler, alıntılar, kitaplık.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, RefreshControl, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { REPORT_REASONS, useReport } from '../../api/content';
import { useBlock, useFollow, useMonthlyStats, useProfileSummary, useUserContent } from '../../api/social';
import { BadgeMedal, nextTierText, TIER_COLOR, TIER_LABEL, XPCard } from '../../components/Gamification';
import { IconBack, IconMore, IconSettings, IconShare } from '../../components/icons';
import { Avatar, Button, Card, Cover, Loading, Overline, T } from '../../components/ui';
import { formatCompact, formatNumber } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { levelProgress } from '../../lib/xp';
import { color, radius, space } from '../../theme/tokens';
import type { BadgeState, MediaKind } from '../../types/db';

const ACTION_LABEL: Record<string, string> = {
  quote_book: 'Kitap alıntısı', quote_screen: 'Film/dizi alıntısı', review_book: 'Kitap incelemesi', review_movie: 'Film incelemesi',
  review_episode: 'Bölüm incelemesi', review_helpful: 'Faydalı inceleme', content_liked: 'Beğeni', start_reading: 'Okumaya başlama', log_movie: 'Film kaydı',
};
const BADGE_UNIT: Record<string, string> = {
  book_worm: 'kitap', long_reader: 'uzun kitap', film_buff: 'film', series_lover: 'bölüm', quote_master: 'alıntı', master_reviewer: 'inceleme', film_critic: 'inceleme',
};
const BADGE_DESC: Record<string, string> = {
  book_worm: 'Okudum durumundaki kitap sayısı.', long_reader: '500 sayfadan uzun bitirilen kitaplar.', film_buff: 'İzledim durumundaki filmler.',
  series_lover: 'İzlendi işaretli bölümler.', quote_master: 'En az 3 beğeni almış alıntılar.', master_reviewer: 'En az 5 faydalı oy almış incelemeler.',
  film_critic: 'Kalite şartını geçen film incelemeleri.',
};
const MONTHS = ['O', 'Ş', 'M', 'N', 'M', 'H', 'T', 'A', 'E', 'E', 'K', 'A'];

function useXpGain(own: boolean, totalXp: number | undefined) {
  return useQuery({
    queryKey: ['xpGain', totalXp],
    enabled: own && totalXp !== undefined,
    queryFn: async () => {
      const { data } = await supabase.from('xp_ledger').select('id, xp, action, created_at').gt('xp', 0).is('reversed_at', null)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!data) return null;
      const last = await AsyncStorage.getItem('xp:lastSeen');
      await AsyncStorage.setItem('xp:lastSeen', data.id);
      const recent = Date.now() - new Date(data.created_at).getTime() < 24 * 3600 * 1000;
      return last !== data.id && recent ? { amount: data.xp as number, reason: ACTION_LABEL[data.action] ?? 'XP' } : null;
    },
  });
}

export function ProfileView({ userId, own, showBack }: { userId: string; own?: boolean; showBack?: boolean }) {
  const summary = useProfileSummary(userId);
  const content = useUserContent(summary.data?.restricted === false ? userId : null);
  const monthly = useMonthlyStats(summary.data?.restricted === false ? userId : null);
  const follow = useFollow(userId);
  const block = useBlock(userId);
  const report = useReport();
  const p = summary.data?.profile;
  const gain = useXpGain(!!own, p?.total_xp);
  const [selected, setSelected] = useState<string | null>(null);

  const library = useQuery({
    queryKey: ['shelves', userId],
    enabled: summary.data?.restricted === false,
    queryFn: async () => {
      const { data, error } = await supabase.from('library_entries')
        .select('status, is_favorite, updated_at, media:media_items!inner(id, title, kind, cover_path)')
        .eq('user_id', userId).order('updated_at', { ascending: false }).limit(60);
      if (error) throw error;
      return data as unknown as { status: string; is_favorite: boolean; media: { id: string; title: string; kind: MediaKind; cover_path: string | null } }[];
    },
  });

  const badges = summary.data?.badges ?? [];
  const latest = useMemo(() => badges.filter((b) => b.awarded_at).sort((a, b) => (b.awarded_at! > a.awarded_at! ? 1 : -1))[0], [badges]);
  const sel: BadgeState | undefined = badges.find((b) => b.code === selected) ?? badges[0];
  useEffect(() => { if (!selected && latest) setSelected(latest.code); }, [latest, selected]);

  if (summary.isLoading || !summary.data || !p) return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><Loading /></SafeAreaView>;

  const lp = levelProgress(p.total_xp ?? 0);
  const name = p.display_name ?? p.username ?? '';
  const isFollowing = summary.data.is_following;
  const pending = summary.data.follow_pending;

  const more = () => {
    const options = ['Şikayet et', 'Engelle', 'Vazgeç'];
    const handle = (i: number) => {
      if (i === 0) {
        Alert.alert('Şikayet nedeni', undefined, [
          ...REPORT_REASONS.map((r) => ({ text: r.label, onPress: () => report.mutate({ target_type: 'profile', target_id: userId, reason: r.id }, { onSuccess: () => Alert.alert('Teşekkürler', 'Şikayetin moderasyon ekibine iletildi.') }) })),
          { text: 'Vazgeç', style: 'cancel' as const },
        ]);
      }
      if (i === 1) {
        Alert.alert(`${name} engellensin mi?`, 'Birbirinizin paylaşımlarını göremez ve takip edemezsiniz.', [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Engelle', style: 'destructive', onPress: () => block.mutate(undefined, { onSuccess: () => router.back() }) },
        ]);
      }
    };
    if (Platform.OS === 'ios') ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 2, destructiveButtonIndex: 1 }, handle);
    else Alert.alert(name, undefined, [{ text: 'Şikayet et', onPress: () => handle(0) }, { text: 'Engelle', onPress: () => handle(1), style: 'destructive' }, { text: 'Vazgeç', style: 'cancel' }]);
  };

  const shelf = (pred: (r: { status: string; is_favorite: boolean; media: { kind: MediaKind } }) => boolean) => (library.data ?? []).filter(pred);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[2], height: 48 }}>
        {showBack ? <IconButton label="Geri" onPress={() => router.back()}><IconBack /></IconButton> : <T v="label" style={{ paddingLeft: space[3], fontSize: 15 }}>@{p.username}</T>}
        <View style={{ flexDirection: 'row' }}>
          <IconButton label="Profili paylaş" onPress={() => Share.share({ message: `BOOKFLIX'te @${p.username}: bookflix://user/${p.id}` })}><IconShare size={21} c={color.text} /></IconButton>
          {own ? <IconButton label="Ayarlar" onPress={() => router.push('/settings')}><IconSettings /></IconButton>
            : <IconButton label="Diğer seçenekler" onPress={more}><IconMore c={color.text} /></IconButton>}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} refreshControl={<RefreshControl refreshing={summary.isRefetching} onRefresh={() => { summary.refetch(); content.refetch(); }} tintColor={color.primary} />}>
        <View style={{ alignItems: 'center', paddingHorizontal: space[6], paddingTop: space[3] }}>
          <View style={{ padding: 5, borderRadius: 60, borderWidth: 3, borderColor: color.primary, shadowColor: color.primary, shadowOpacity: 0.3, shadowRadius: 20 }}>
            <Avatar name={name} path={p.avatar_path} size={86} />
          </View>
          <View style={{ marginTop: -12, backgroundColor: color.primary, borderRadius: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center', borderWidth: 3, borderColor: color.bg }}>
            <T v="caption" c={color.onPrimary} style={{ fontFamily: 'Inter_800ExtraBold' }}>Sv. {p.level}</T>
          </View>
          <T v="titleLg" style={{ marginTop: space[3] }}>{name}</T>
          {p.bio ? <T v="bodySm" c={color.textSoft} style={{ textAlign: 'center', marginTop: 6 }}>{p.bio}</T> : null}
          <View style={{ flexDirection: 'row', gap: 28, marginTop: 14 }}>
            <Count n={p.follower_count} l="takipçi" />
            <Count n={p.following_count} l="takip" />
            {summary.data.restricted ? null : <Count n={p.quote_count} l="alıntı" />}
            {summary.data.restricted ? null : <Count n={p.review_count} l="inceleme" />}
          </View>
          {own ? (
            <Button title="Profili düzenle" kind="secondary" onPress={() => router.push('/settings/profile')} style={{ alignSelf: 'stretch', marginTop: space[4] }} />
          ) : (
            <Button title={isFollowing ? 'Takip ediliyor' : pending ? 'İstek gönderildi' : 'Takip et'} kind={isFollowing || pending ? 'tonal' : 'primary'}
              onPress={() => follow.mutate(!!isFollowing || !!pending)} loading={follow.isPending} style={{ alignSelf: 'stretch', marginTop: space[4] }} />
          )}
        </View>

        {summary.data.restricted ? (
          <Card style={{ margin: space[4], alignItems: 'center' }}>
            <T v="titleSm">Bu hesap gizli</T>
            <T v="bodySm" c={color.textMuted} style={{ textAlign: 'center', marginTop: 6 }}>Kitaplığını ve paylaşımlarını görmek için takip isteği gönder.</T>
          </Card>
        ) : (
          <>
            {own ? (
              <View style={{ paddingHorizontal: space[4], marginTop: space[6] }}>
                <XPCard totalXp={p.total_xp} xpToday={summary.data.xp_today ?? 0} gain={gain.data ?? null} />
              </View>
            ) : (
              <Card style={{ marginHorizontal: space[4], marginTop: space[6], flexDirection: 'row', justifyContent: 'space-between' }}>
                <View><Overline>Toplam XP</Overline><T v="statMd" style={{ marginTop: 4 }}>{formatNumber(p.total_xp)}</T></View>
                <View style={{ alignItems: 'flex-end' }}><Overline>Seviye</Overline><T v="statMd" c={color.primary} style={{ marginTop: 4 }}>{lp.level}</T></View>
              </Card>
            )}

            {latest ? (
              <View style={{ marginHorizontal: space[4], marginTop: 14, padding: 14, borderRadius: 18, flexDirection: 'row', gap: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(243,210,122,0.3)', backgroundColor: 'rgba(243,210,122,0.06)' }}>
                <BadgeMedal icon={latest.icon} tier={latest.tier} size={52} pop />
                <View style={{ flex: 1 }}>
                  <T v="overline" c={color.metalGold}>SON BAŞARI</T>
                  <T v="label" style={{ fontSize: 15, marginTop: 2 }}>{latest.name} · {TIER_LABEL[latest.tier].charAt(0) + TIER_LABEL[latest.tier].slice(1).toLocaleLowerCase('tr-TR')}</T>
                  <T v="caption" c={color.textMuted}>{BADGE_DESC[latest.code]}</T>
                </View>
              </View>
            ) : null}

            <View style={{ paddingHorizontal: space[4], marginTop: 26 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Overline>Rozet koleksiyonu</Overline>
                <T v="caption" c={color.textMuted}><T v="caption" style={{ fontFamily: 'Inter_700Bold' }}>{badges.filter((b) => b.tier > 0).length}</T> / {badges.length} kazanıldı</T>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space[4], rowGap: 18 }}>
                {badges.map((b) => (
                  <Pressable key={b.code} onPress={() => setSelected(b.code)} accessibilityRole="button" accessibilityLabel={`${b.name}, ${TIER_LABEL[b.tier].toLocaleLowerCase('tr-TR')}`}
                    accessibilityState={{ selected: sel?.code === b.code }}
                    style={{ width: '33.33%', alignItems: 'center', paddingVertical: 6, borderRadius: 16, borderWidth: sel?.code === b.code ? 2 : 0, borderColor: 'rgba(0,229,160,0.6)' }}>
                    <BadgeMedal icon={b.icon} tier={b.tier} />
                    <T v="label" style={{ marginTop: 10 }}>{b.name}</T>
                    <T v="overline" c={TIER_COLOR[b.tier]} style={{ marginTop: 2 }}>{TIER_LABEL[b.tier]}</T>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: color.border, alignSelf: 'stretch', marginHorizontal: 14, marginTop: space[2] }}>
                      <View style={{ height: 4, borderRadius: 2, backgroundColor: color.primary, width: `${b.tier >= 3 ? 100 : Math.min(100, (b.progress / ((b.tiers as readonly number[])[b.tier] ?? 1)) * 100)}%` }} />
                    </View>
                    <T v="caption" c={color.textMuted} style={{ fontSize: 10, marginTop: 4 }}>{nextTierText(b.progress, b.tiers, b.tier, BADGE_UNIT[b.code] ?? '')}</T>
                  </Pressable>
                ))}
              </View>
              {sel ? (
                <Card style={{ marginTop: space[4] }}>
                  <T v="label" style={{ fontSize: 14 }}>{sel.name} · {TIER_LABEL[sel.tier]}</T>
                  <T v="caption" c={color.textMuted} style={{ marginTop: 3 }}>{BADGE_DESC[sel.code]} Bronz {sel.tiers[0]}, gümüş {sel.tiers[1]}, altın {sel.tiers[2]}. Şu an {sel.progress}.</T>
                </Card>
              ) : null}
            </View>

            <View style={{ paddingHorizontal: space[4], marginTop: 26 }}>
              <Overline>{`${new Date().getFullYear()} istatistikleri`}</Overline>
              <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[3] }}>
                <Stat n={formatCompact(summary.data.stats?.books_completed ?? 0)} l="kitap" />
                <Stat n={formatCompact(summary.data.stats?.pages_read ?? 0)} l="sayfa" />
                <Stat n={formatCompact(summary.data.stats?.movies_watched ?? 0)} l="film" c={color.accent} />
                <Stat n={formatCompact(summary.data.stats?.episodes_watched ?? 0)} l="bölüm" c={color.accent} />
              </View>
              {monthly.data ? <MonthlyChart data={monthly.data} /> : null}
            </View>

            {(content.data?.reviews.length ?? 0) > 0 ? (
              <View style={{ paddingHorizontal: space[4], marginTop: 26, gap: space[2] }}>
                <Overline>En faydalı incelemeler</Overline>
                {content.data!.reviews.slice(0, 3).map((r) => (
                  <Pressable key={r.id} onPress={() => router.push(`/review/${r.id}`)} accessibilityRole="link">
                    <Card style={{ flexDirection: 'row', gap: space[3] }}>
                      <Cover id={r.media.id} path={r.media.cover_path} width={44} />
                      <View style={{ flex: 1 }}>
                        <T v="overline" c={r.media.kind === 'book' ? color.primary : color.accent}>{`${r.media.kind === 'book' ? 'KİTAP' : r.media.kind === 'series' ? 'DİZİ' : 'FİLM'} · ${r.media.title} · ${r.rating}/10`.toLocaleUpperCase('tr-TR')}</T>
                        <T v="titleSm" style={{ fontSize: 16, marginTop: 3 }}>{r.title ?? 'İnceleme'}</T>
                        <T v="caption" c={color.textMuted} style={{ marginTop: 6 }}><T v="caption" c={color.primary} style={{ fontFamily: 'Inter_700Bold' }}>{r.helpful_count}</T> kişi faydalı buldu</T>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {(content.data?.quotes.length ?? 0) > 0 ? (
              <View style={{ marginTop: 26 }}>
                <View style={{ paddingHorizontal: space[4] }}><Overline>Kitap alıntıları</Overline></View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: space[4], paddingTop: space[3] }}>
                  {content.data!.quotes.filter((q) => q.media.kind === 'book').map((q) => (
                    <Pressable key={q.id} onPress={() => router.push(`/quote/${q.id}`)} accessibilityRole="link">
                      <Card style={{ width: 250 }}>
                        <T v="quoteMd" style={{ fontStyle: 'normal', fontFamily: 'Fraunces_400Regular' }} numberOfLines={5}>“{q.body}”</T>
                        <T v="caption" c={color.textMuted} style={{ marginTop: 10 }}>{q.media.title} · {q.page_number && !q.hide_page ? `s. ${q.page_number}` : 'sayfa gizli'} · {q.like_count} beğeni</T>
                      </Card>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {(content.data?.reviews.filter((r) => r.media.kind === 'movie').length ?? 0) > 0 ? (
              <View style={{ paddingHorizontal: space[4], marginTop: 26 }}>
                <Overline>Film incelemeleri</Overline>
                {content.data!.reviews.filter((r) => r.media.kind === 'movie').map((r) => (
                  <Pressable key={r.id} onPress={() => router.push(`/review/${r.id}`)} accessibilityRole="link"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56, borderBottomWidth: 1, borderBottomColor: '#141D19' }}>
                    <T v="label" style={{ flex: 1, fontSize: 14 }}>{r.media.title}</T>
                    <T v="caption" c={color.textMuted}>{r.helpful_count} faydalı</T>
                    <T v="label" c={color.primary} style={{ fontFamily: 'Inter_800ExtraBold' }}>{r.rating}</T>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Shelf title="Kitaplık" items={shelf((r) => r.media.kind === 'book')} />
            <Shelf title="İzlenen filmler" items={shelf((r) => r.media.kind === 'movie' && r.status === 'completed')} />
            <Shelf title="Takip edilen diziler" items={shelf((r) => r.media.kind === 'series')} />
            <Shelf title="Favoriler" items={shelf((r) => r.is_favorite)} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>{children}</Pressable>;
}

function Count({ n, l }: { n: number; l: string }) {
  return <View style={{ alignItems: 'center' }}><T v="statMd" style={{ fontSize: 18, lineHeight: 22 }}>{formatCompact(n)}</T><T v="caption" c={color.textMuted}>{l}</T></View>;
}

function Stat({ n, l, c = color.text }: { n: string; l: string; c?: string }) {
  return <Card style={{ flex: 1, padding: 12, borderRadius: 14 }}><T v="statMd" c={c} style={{ fontSize: 20 }}>{n}</T><T v="caption" c={color.textMuted}>{l}</T></Card>;
}

function MonthlyChart({ data }: { data: { books: number; films: number }[] }) {
  const max = Math.max(1, ...data.flatMap((m) => [m.books, m.films]));
  const month = new Date().getMonth();
  const shown = data.slice(0, month + 1);
  return (
    <Card style={{ marginTop: space[2] }}>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <Legend c={color.primary} l="Kitap" /><Legend c={color.chartFilm} l="Film" />
      </View>
      <View accessible accessibilityLabel={`Bu yıl aylara göre ${shown.reduce((a, m) => a + m.books, 0)} kitap ve ${shown.reduce((a, m) => a + m.films, 0)} film`}
        style={{ flexDirection: 'row', alignItems: 'flex-end', height: 110, marginTop: 12, gap: 6 }}>
        {shown.map((m, i) => (
          <View key={i} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height: 110 }}>
            <View style={{ width: 7, height: (m.books / max) * 104 + 2, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: color.primary }} />
            <View style={{ width: 7, height: (m.films / max) * 104 + 2, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: color.chartFilm }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
        {shown.map((_, i) => <T key={i} v="caption" c={color.textMuted} style={{ flex: 1, textAlign: 'center', fontSize: 10 }}>{MONTHS[i]}</T>)}
      </View>
    </Card>
  );
}

function Legend({ c, l }: { c: string; l: string }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c }} /><T v="caption" c={color.textMuted}>{l}</T></View>;
}

function Shelf({ title, items }: { title: string; items: { media: { id: string; title: string; cover_path: string | null } }[] }) {
  if (!items.length) return null;
  return (
    <View style={{ marginTop: 26 }}>
      <View style={{ paddingHorizontal: space[4] }}><Overline>{`${title} · ${items.length}`}</Overline></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: space[4], paddingTop: space[3] }}>
        {items.slice(0, 20).map(({ media }) => (
          <Pressable key={media.id} onPress={() => router.push(`/media/${media.id}`)} accessibilityRole="link" accessibilityLabel={media.title}>
            <Cover id={media.id} path={media.cover_path} title={media.title} width={86} radius={radius.xs} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
