// Kitap / film / dizi detayı: büyük afiş, ayrı puan rozetleri, durum, dizi takibi, sekmeler, geçmiş ve istatistik.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useLibraryEntry, useMedia, useRemoveFromLibrary, useSaveCurrentPage, useMediaQuotes, useMediaReviews, useMyHistory, useSeasons, useSeriesProgress, useSetLibrary, useSimilarMedia, useToggleEpisode,
} from '../../src/api/media';
import { useToggleHelpful } from '../../src/api/feed';
import { IconBack, IconCheck, IconShare, IconThumb } from '../../src/components/icons';
import { RatingRow, Stars } from '../../src/components/Ratings';
import { SpoilerVeil } from '../../src/components/SpoilerVeil';
import { Avatar, Button, Card, ChipRow, Cover, EmptyState, Loading, Overline, T } from '../../src/components/ui';
import { formatNumber, minutesToText, relativeTime } from '../../src/lib/format';
import { haptic } from '../../src/lib/haptics';
import { imageUrl } from '../../src/lib/images';
import { color, radius, space } from '../../src/theme/tokens';
import { inputStyle } from '../../src/theme/inputs';
import type { LibraryStatus, MediaDetail } from '../../src/types/db';
import { EditionsSection } from '../../src/features/editions/EditionsSection';
import { useActiveSession } from '../../src/features/session/sessionStore';

const STATUS_LABELS = {
  book: { planned: 'Okuyacağım', in_progress: 'Okuyorum', completed: 'Okudum' },
  movie: { planned: 'İzleyeceğim', in_progress: 'İzliyorum', completed: 'İzledim' },
  series: { planned: 'İzleyeceğim', in_progress: 'İzliyorum', completed: 'İzledim' },
} as const;

const HISTORY_TEXT: Record<string, string> = {
  started_reading: 'Okumaya başladın', finished_book: 'Kitabı bitirdin', watched_movie: 'Filmi izledin', watching_series: 'Diziyi izlemeye başladın',
  finished_series: 'Diziyi bitirdin', quoted: 'Alıntı paylaştın', reviewed: 'İnceleme yazdın',
};

type Tab = 'details' | 'reviews' | 'quotes' | 'cast' | 'similar';

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const media = useMedia(id);
  const entry = useLibraryEntry(id);
  const setLib = useSetLibrary(id);
  const removeLib = useRemoveFromLibrary(id);
  const activeSession = useActiveSession();
  const [tab, setTab] = useState<Tab>('details');
  const [rateOpen, setRateOpen] = useState(false);
  const m = media.data;
  const isSeries = m?.kind === 'series';
  const progress = useSeriesProgress(id, isSeries);
  const toggleEp = useToggleEpisode(id);

  if (media.isLoading || !m) return <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: insets.top }}><Loading /></View>;

  const labels = STATUS_LABELS[m.kind];
  const status = entry.data?.status;
  const people = [...m.media_contributors].sort((a, b) => a.sort_order - b.sort_order);
  const leads = people.filter((p) => ['director', 'author', 'creator'].includes(p.role)).map((p) => p.contributors.name);
  const hero = imageUrl(m.backdrop_path ?? m.cover_path);
  const tabs = [
    { id: 'details' as const, label: 'Detaylar' },
    { id: 'reviews' as const, label: 'İncelemeler' },
    { id: 'quotes' as const, label: 'Alıntılar' },
    ...(m.kind === 'book' ? [] : [{ id: 'cast' as const, label: 'Oyuncular' }]),
    { id: 'similar' as const, label: m.kind === 'book' ? 'Benzer Kitaplar' : 'Benzer Yapımlar' },
  ];

  const pickStatus = (s: LibraryStatus) => {
    // Seçili duruma tekrar dokunmak eseri kütüphaneden çıkarır.
    if (status === s) {
      removeLib.mutate(undefined, { onError: () => Alert.alert('Kaldırılamadı', 'Lütfen tekrar dene.') });
      return;
    }
    setLib.mutate({ status: s }, {
      onSuccess: () => { if (s === 'completed' && !entry.data?.rating) setRateOpen(true); },
      onError: () => Alert.alert('Kaydedilemedi', 'Lütfen tekrar dene.'),
    });
  };

  const isBook = m.kind === 'book';
  // Kitap adı "Ad: Alt başlık" biçimindeyse alt başlık ayrı ve küçük gösterilir.
  const colon = isBook ? m.title.indexOf(': ') : -1;
  const mainTitle = colon > 0 ? m.title.slice(0, colon) : m.title;
  const subTitle = colon > 0 ? m.title.slice(colon + 2) : null;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={{ height: 480, backgroundColor: '#0D1830' }}>
          {hero ? <Image source={{ uri: hero }} style={[StyleSheet.absoluteFill, isBook && { opacity: 0.35 }]} contentFit="cover" transition={250}
            blurRadius={isBook ? 40 : 0} accessibilityIgnoresInvertColors /> : null}
          <LinearGradient colors={['rgba(8,11,10,0)', color.bg]} locations={[0, 0.92]} style={[StyleSheet.absoluteFill, { top: isBook ? 0 : 220 }]} />
          <View style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Glass label="Geri" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}><IconBack /></Glass>
            <Glass label="Paylaş" onPress={() => Share.share({ message: `${m.title} · BOOKFLIX: bookflix://media/${m.id}` })}><IconShare c={color.text} /></Glass>
          </View>
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 18 }}>
            {isBook && hero ? (
              <Image source={{ uri: hero }} style={{ width: 104, height: 156, borderRadius: 10, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 14 }, elevation: 8 }} contentFit="cover"
                transition={250} accessibilityLabel={`${mainTitle} kapağı`} />
            ) : null}
            <View style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(0,217,192,0.45)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <T v="overline" c={color.accent}>{m.kind === 'book' ? 'KİTAP' : m.kind === 'movie' ? 'FİLM' : 'DİZİ'}</T>
            </View>
            <T v={isBook ? 'displayLg' : 'displayXl'} style={{ marginTop: 10 }} accessibilityRole="header" numberOfLines={3}>{mainTitle}</T>
            {subTitle ? <T v="body" c={color.textSoft} style={{ marginTop: 4 }} numberOfLines={2}>{subTitle}</T> : null}
            <T v="bodySm" c={color.textSoft} style={{ marginTop: 6 }}>{metaLine(m)}</T>
            {leads.length ? <T v="bodySm" c={color.textMuted}>{m.kind === 'book' ? 'Yazar' : m.kind === 'movie' ? 'Yönetmen' : 'Yaratıcı'} <T v="label">{leads.slice(0, 2).join(', ')}</T></T> : null}
          </View>
        </View>

        <View style={{ paddingHorizontal: space[4], marginTop: 6 }}>
          <RatingRow media={m} myRating={entry.data?.rating ?? null} onRate={() => setRateOpen(true)} />
        </View>

        <View style={{ flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], marginTop: 14 }} accessibilityRole="radiogroup">
          {(['planned', 'in_progress', 'completed'] as const).map((s) => {
            const on = status === s;
            return (
              <Pressable key={s} onPress={() => pickStatus(s)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                accessibilityHint={on ? 'Tekrar dokunursan listenden çıkarılır' : undefined}
                style={[{ flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
                  on ? { backgroundColor: color.primary, borderColor: color.primary, shadowColor: color.primary, shadowOpacity: 0.4, shadowRadius: 22 } : { backgroundColor: color.surface, borderColor: '#1F2B26' }]}>
                <T v="label" c={on ? color.onPrimary : color.text} style={{ fontFamily: 'Inter_700Bold' }}>{labels[s]}</T>
              </Pressable>
            );
          })}
        </View>

        {m.kind === 'book' ? (
          <View style={{ paddingHorizontal: space[4], marginTop: space[3] }}>
            <Button title={activeSession?.mediaId === m.id ? "Süren oturuma dön" : "Okuma oturumu başlat"} onPress={() => router.push(`/session/${m.id}`)} />
          </View>
        ) : null}

        {m.kind === 'book' && status === 'in_progress' ? <PageProgress mediaId={id} current={entry.data?.current_page ?? null} total={m.book_details?.page_count ?? null} /> : null}

        {isSeries && progress.data && progress.data.total > 0 ? (
          <Card style={{ marginHorizontal: space[4], marginTop: 14, flexDirection: 'row', gap: space[4], alignItems: 'center' }}>
            <View accessible accessibilityLabel={`İlerleme yüzde ${Math.round((progress.data.watched / progress.data.total) * 100)}`}
              style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 7, borderColor: color.border, alignItems: 'center', justifyContent: 'center' }}>
              <T v="statMd" style={{ fontSize: 18 }}>{Math.round((progress.data.watched / progress.data.total) * 100)}%</T>
            </View>
            <View style={{ flex: 1 }}>
              <T v="caption" c={color.textMuted}>İlerlemen · {progress.data.watched} / {progress.data.total} bölüm</T>
              <T v="titleSm" style={{ marginTop: 4 }}>{progress.data.next_episode_id ? `Sıradaki: S${progress.data.next_season} B${progress.data.next_episode}${progress.data.next_title ? ` · ${progress.data.next_title}` : ''}` : 'Hepsi izlendi'}</T>
              {progress.data.next_episode_id ? (
                <Button title="İzledim olarak işaretle" style={{ alignSelf: 'flex-start', marginTop: 10, minHeight: 40 }}
                  onPress={() => toggleEp.mutate({ episodeId: progress.data!.next_episode_id!, watched: false })} />
              ) : null}
            </View>
          </Card>
        ) : null}

        <View style={{ marginTop: 20, borderBottomWidth: 1, borderBottomColor: '#16201C' }}>
          <ChipRow items={tabs} value={tab} onChange={setTab} />
        </View>

        {tab === 'details' ? <DetailsTab m={m} /> : null}
        {tab === 'reviews' ? <ReviewsTab mediaId={id} /> : null}
        {tab === 'quotes' ? <QuotesTab mediaId={id} kind={m.kind} /> : null}
        {tab === 'cast' ? <CastTab m={m} /> : null}
        {tab === 'similar' ? <SimilarTab m={m} /> : null}
      </ScrollView>

      <RateModal visible={rateOpen} current={entry.data?.rating ?? null} title={m.title}
        onClose={() => setRateOpen(false)}
        onPick={(r) => { setLib.mutate({ rating: r, status: status ?? 'completed' }); setRateOpen(false); haptic.success(); }}
        onReview={() => { setRateOpen(false); router.push({ pathname: '/compose/review', params: { mediaId: id } }); }} />
    </View>
  );
}

function metaLine(m: MediaDetail): string {
  const parts: string[] = [];
  if (m.year) parts.push(m.kind === 'series' ? `${m.year}–` : String(m.year));
  if (m.screen_details?.genres?.length) parts.push(m.screen_details.genres.slice(0, 2).join(', '));
  if (m.kind === 'movie' && m.screen_details?.runtime_minutes) parts.push(minutesToText(m.screen_details.runtime_minutes));
  if (m.kind === 'series' && m.screen_details?.season_count) parts.push(`${m.screen_details.season_count} sezon`);
  if (m.kind === 'book' && m.book_details?.page_count) parts.push(`${m.book_details.page_count} sayfa`);
  if (m.kind === 'book' && m.book_details?.publisher) parts.push(m.book_details.publisher);
  return parts.join(' · ');
}

function Glass({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(8,11,10,0.55)', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </Pressable>
  );
}

function PageProgress({ mediaId, current, total }: { mediaId: string; current: number | null; total: number | null }) {
  const save = useSaveCurrentPage(mediaId);
  const [page, setPage] = useState(current ? String(current) : '');
  const [saved, setSaved] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Başka yerden (okuma oturumu) güncellenirse kutuyu da güncelle
  useEffect(() => { if (!focused.current) setPage(current ? String(current) : ''); }, [current]);
  const commit = (txt: string) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const n = Number(txt);
    if (!txt || !(n > 0)) return;
    const v = total ? Math.min(n, total) : n;
    if (v === current) return;
    setSaved('saving');
    save(v).then(() => setSaved('ok')).catch(() => setSaved('err'));
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const shown = Number(page) || current || 0;
  const pct = shown && total ? Math.min(1, shown / total) : 0;
  return (
    <Card style={{ marginHorizontal: space[4], marginTop: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <View style={{ flex: 1 }}>
          <T v="label">Kaldığın sayfa</T>
          <T v="caption" c={saved === 'err' ? color.danger : saved === 'ok' ? color.primary : color.textFaint}>
            {saved === 'saving' ? 'Kaydediliyor…' : saved === 'ok' ? 'Kaydedildi' : saved === 'err' ? 'Kaydedilemedi, tekrar dene' : 'Yazınca otomatik kaydedilir'}
          </T>
        </View>
        <TextInput value={page} keyboardType="number-pad" accessibilityLabel="Kaldığın sayfa" returnKeyType="done"
          onChangeText={(t) => { const v = t.replace(/\D/g, '').slice(0, 5); setPage(v); setSaved('idle');
            if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => commit(v), 900); }}
          onFocus={() => { focused.current = true; }}
          onBlur={() => { focused.current = false; commit(page); }}
          onSubmitEditing={() => commit(page)}
          style={[inputStyle, { width: 90, height: 44, textAlign: 'center' }]} />
        {total ? <T v="caption" c={color.textMuted}>/ {total}</T> : null}
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: color.surfaceSunken, marginTop: space[3] }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: color.primary, width: `${pct * 100}%` }} />
      </View>
    </Card>
  );
}

function DetailsTab({ m }: { m: MediaDetail }) {
  const isSeries = m.kind === 'series';
  const seasons = useSeasons(m.id, isSeries);
  const toggle = useToggleEpisode(m.id);
  const history = useMyHistory(m.id);
  const [season, setSeason] = useState<number | null>(null);
  const currentSeason = seasons.data?.find((s) => s.season_number === (season ?? seasons.data?.find((x) => x.episodes.some((e) => !e.watched))?.season_number ?? 1)) ?? seasons.data?.[0];
  const stats = m.media_stats;
  const gb = m.external_ratings.find((r) => r.source === 'google_books');

  return (
    <View style={{ padding: space[4], gap: 22 }}>
      <View>
        {m.description ? <T v="body" c="#D5DED9">{m.description}</T> : <T v="body" c={color.textMuted}>Açıklama henüz yok.</T>}
        {gb ? <T v="caption" c={color.textFaint} style={{ marginTop: space[2] }}>Kitap bilgileri: Google Books</T> : null}
        {m.kind === 'book' ? <BookCredits m={m} /> : null}
        <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[4] }}>
          <Button title="Alıntı ekle" kind="tonal" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/compose/quote', params: { mediaId: m.id } })} />
          <Button title="İnceleme yaz" kind="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/compose/review', params: { mediaId: m.id } })} />
        </View>
      </View>

      {m.kind === 'book' ? <EditionsSection mediaId={m.id} title={m.title} /> : null}

      {isSeries && seasons.data?.length ? (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Overline>Sezonlar ve bölümler</Overline>
            <T v="caption" c={color.textMuted}>Uzun bas: buraya kadar</T>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space[2], marginTop: space[3] }}>
            {seasons.data.map((s) => {
              const on = s.season_number === currentSeason?.season_number;
              const done = s.episodes.filter((e) => e.watched).length;
              return (
                <Pressable key={s.id} onPress={() => setSeason(s.season_number)} accessibilityRole="button" accessibilityState={{ selected: on }}
                  style={{ height: 40, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
                    borderColor: on ? color.primary : '#1F2B26', backgroundColor: on ? 'rgba(0,229,160,0.1)' : color.surface }}>
                  <T v="label">{s.season_number}. Sezon</T>
                  <T v="caption" c={on ? color.primary : color.textFaint}>{done}/{s.episodes.length}</T>
                </Pressable>
              );
            })}
          </ScrollView>
          {currentSeason?.episodes.map((e) => (
            <Pressable key={e.id} onLongPress={() => toggle.mutate({ episodeId: e.id, watched: e.watched, until: true })}
              onPress={() => toggle.mutate({ episodeId: e.id, watched: e.watched })}
              accessibilityRole="checkbox" accessibilityState={{ checked: e.watched }}
              accessibilityLabel={`${e.episode_number}. bölüm${e.title ? `, ${e.title}` : ''}`} accessibilityHint="Uzun basınca bu bölüme kadar hepsi izlendi olur"
              style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56, borderBottomWidth: 1, borderBottomColor: '#141D19' }}>
              <T v="label" c={e.watched ? color.primary : color.textFaint} style={{ width: 26, fontFamily: 'Inter_700Bold' }}>{e.episode_number}</T>
              <View style={{ flex: 1 }}>
                <T v="label" c={e.watched ? color.textSoft : color.text} style={{ fontSize: 14 }}>{e.title ?? `${e.episode_number}. Bölüm`}</T>
                <T v="caption" c={color.textMuted} style={{ fontSize: 11 }}>{e.watched ? 'İzlendi' : minutesToText(e.runtime_minutes) || ' '}{e.air_date ? ` · ${e.air_date.slice(0, 4)}` : ''}</T>
              </View>
              <View style={{ width: 28, height: 28, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
                borderColor: e.watched ? color.primary : color.borderStrong, backgroundColor: e.watched ? color.primary : 'transparent' }}>
                {e.watched ? <IconCheck /> : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {history.data?.length ? (
        <View>
          <Overline>{m.kind === 'book' ? 'Okuma geçmişin' : 'İzleme geçmişin'}</Overline>
          <View style={{ marginTop: space[3], paddingLeft: 14, borderLeftWidth: 1, borderLeftColor: '#22302A', gap: 14 }}>
            {history.data.map((h, i) => (
              <View key={h.id}>
                <View style={{ position: 'absolute', left: -19, top: 5, width: 9, height: 9, borderRadius: 5, backgroundColor: i === 0 ? color.primary : color.borderStrong }} />
                <T v="label" style={{ fontSize: 14 }}>{HISTORY_TEXT[h.verb] ?? h.verb}</T>
                <T v="caption" c={color.textMuted}>{new Date(h.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</T>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View>
        <Overline>BOOKFLIX istatistikleri</Overline>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[3] }}>
          <Box n={formatNumber(stats?.reader_count ?? 0)} l={m.kind === 'book' ? 'okuyan' : 'izleyen'} />
          <Box n={formatNumber(stats?.review_count ?? 0)} l="inceleme" />
          <Box n={formatNumber(stats?.quote_count ?? 0)} l="alıntı" />
          <Box n={formatNumber(stats?.user_rating_count ?? 0)} l="puan" />
        </View>
      </View>
    </View>
  );
}

function Box({ n, l }: { n: string; l: string }) {
  return <Card style={{ width: '48.5%', padding: 14, borderRadius: 16 }}><T v="statMd" c={color.accent} style={{ fontSize: 22 }}>{n}</T><T v="caption" c={color.textMuted}>{l}</T></Card>;
}

function ReviewsTab({ mediaId }: { mediaId: string }) {
  const [sort, setSort] = useState<'helpful' | 'recent' | 'nospoil'>('helpful');
  const reviews = useMediaReviews(mediaId, sort === 'recent' ? 'recent' : 'helpful', sort === 'nospoil');
  const helpful = useToggleHelpful();
  return (
    <View style={{ paddingVertical: space[3] }}>
      <ChipRow items={[{ id: 'helpful', label: 'En faydalı' }, { id: 'recent', label: 'En yeni' }, { id: 'nospoil', label: "Spoiler'sız" }] as const} value={sort} onChange={setSort} />
      <View style={{ paddingHorizontal: space[4], gap: space[3], marginTop: space[2] }}>
        {reviews.isLoading ? <Loading /> : !reviews.data?.length ? <EmptyState title="Henüz inceleme yok" body="İlk incelemeyi sen yaz." action="İnceleme yaz" onAction={() => router.push({ pathname: '/compose/review', params: { mediaId } })} /> : null}
        {reviews.data?.map((r) => (
          <Card key={r.id}>
            <Pressable onPress={() => router.push(`/review/${r.id}`)} accessibilityRole="link">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar name={r.author.display_name ?? r.author.username} path={r.author.avatar_path} size={32} />
                <View style={{ flex: 1 }}>
                  <T v="label" style={{ fontSize: 14 }}>{r.author.display_name ?? r.author.username}</T>
                  <T v="caption" c={color.textMuted}>{relativeTime(r.created_at)}{r.edited_at ? ' · düzenlendi' : ''}</T>
                </View>
                <T v="label" c={color.primary} style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14 }}>{r.rating}/10</T>
              </View>
              {r.title ? <T v="titleSm" style={{ marginTop: space[3] }}>{r.title}</T> : null}
            </Pressable>
            {r.has_spoiler ? <SpoilerVeil text={r.body} /> : <T v="bodySm" c="#D5DED9" numberOfLines={6} style={{ marginTop: space[2] }}>{r.body}</T>}
            <Pressable onPress={() => helpful.mutate(r.id)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, marginTop: 4 }}>
              <IconThumb /><T v="label" c={color.textMuted}>Faydalı · {r.helpful_count}</T>
            </Pressable>
          </Card>
        ))}
      </View>
    </View>
  );
}

function QuotesTab({ mediaId, kind }: { mediaId: string; kind: string }) {
  const quotes = useMediaQuotes(mediaId);
  return (
    <View style={{ padding: space[4], gap: space[3] }}>
      {quotes.isLoading ? <Loading /> : !quotes.data?.length ? <EmptyState title="Henüz alıntı yok" body={kind === 'book' ? 'Sevdiğin bir cümleyi sayfa numarasıyla paylaş.' : 'Bir repliği sahne notuyla paylaş.'} action="Alıntı ekle" onAction={() => router.push({ pathname: '/compose/quote', params: { mediaId } })} /> : null}
      {quotes.data?.map((q) => (
        <Pressable key={q.id} onPress={() => router.push(`/quote/${q.id}`)} accessibilityRole="link">
          <Card>
            {q.has_spoiler ? <SpoilerVeil text={q.body} /> : (
              <T v={kind === 'book' ? 'quoteMd' : 'quoteMd'} style={kind === 'book' ? { fontStyle: 'normal', fontFamily: 'Fraunces_400Regular' } : { borderLeftWidth: 2, borderLeftColor: color.accent, paddingLeft: 12 }}>
                {kind === 'book' ? `“${q.body}”` : q.body}
              </T>
            )}
            <T v="caption" c={color.textMuted} style={{ marginTop: 10 }}>
              {kind === 'book' ? (q.page_number && !q.hide_page ? `Sayfa ${q.page_number}` : 'Sayfa gizli') : q.scene_note ?? ''} · {q.author.display_name ?? q.author.username} · {q.like_count} beğeni
            </T>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

const BOOK_ROLES = [['compiler', 'Derleyen'], ['editor', 'Editör'], ['translator', 'Çeviren']] as const;

function BookCredits({ m }: { m: MediaDetail }) {
  const rows = BOOK_ROLES.map(([role, label]) => ({
    label,
    names: m.media_contributors.filter((p) => p.role === role).sort((a, b) => a.sort_order - b.sort_order).map((p) => p.contributors.name),
  })).filter((r) => r.names.length);
  if (!rows.length) return null;
  return (
    <View style={{ marginTop: space[3], gap: 2 }}>
      {rows.map((r) => (
        <T key={r.label} v="bodySm" c={color.textMuted}>{r.label} <T v="label">{r.names.join(', ')}</T></T>
      ))}
    </View>
  );
}

function CastTab({ m }: { m: MediaDetail }) {
  const cast = m.media_contributors.filter((p) => p.role === 'actor').sort((a, b) => a.sort_order - b.sort_order);
  const crew = m.media_contributors.filter((p) => p.role !== 'actor');
  return (
    <View style={{ padding: space[4] }}>
      {crew.length ? <T v="bodySm" c={color.textMuted} style={{ marginBottom: space[4] }}>{crew.map((c) => `${c.contributors.name} (${c.role === 'director' ? 'yönetmen' : c.role === 'writer' ? 'senarist' : 'yaratıcı'})`).join(' · ')}</T> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space[4] }}>
        {cast.map((c) => (
          <View key={c.contributors.id} style={{ width: '33.33%', alignItems: 'center' }}>
            <Avatar name={c.contributors.name} path={c.contributors.photo_path} size={76} />
            <T v="label" style={{ marginTop: space[2], textAlign: 'center' }}>{c.contributors.name}</T>
            {c.character_name ? <T v="caption" c={color.textMuted} style={{ textAlign: 'center' }}>{c.character_name}</T> : null}
          </View>
        ))}
      </View>
      {!cast.length ? <EmptyState title="Oyuncu bilgisi yok" /> : null}
      <T v="caption" c={color.textFaint} style={{ marginTop: space[6] }}>Yapım bilgileri TMDB API'si ile sağlanır; bu ürün TMDB tarafından onaylanmamıştır.</T>
    </View>
  );
}

function SimilarTab({ m }: { m: MediaDetail }) {
  const similar = useSimilarMedia(m.id, m.kind, m.screen_details?.genres);
  return (
    <View style={{ padding: space[4], flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {similar.isLoading ? <Loading /> : null}
      {similar.data?.map((s) => (
        <Pressable key={s.id} style={{ width: '31%' }} onPress={() => router.push(`/media/${s.id}`)} accessibilityRole="link" accessibilityLabel={s.title}>
          <Cover id={s.id} path={s.cover_path} title={s.title} width={108} radius={10} />
          <T v="label" numberOfLines={1} style={{ marginTop: 6 }}>{s.title}</T>
        </Pressable>
      ))}
      {similar.data && !similar.data.length ? <EmptyState title="Henüz benzer yapım bulunamadı" /> : null}
    </View>
  );
}

function RateModal({ visible, current, title, onClose, onPick, onReview }: {
  visible: boolean; current: number | null; title: string; onClose: () => void; onPick: (r: number) => void; onReview: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={onClose} accessibilityLabel="Kapat" />
      <View style={{ backgroundColor: color.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: space[6], paddingBottom: 40 }}>
        <T v="titleMd">{title}</T>
        <T v="bodySm" c={color.textMuted} style={{ marginTop: 4 }}>10 üzerinden puanın</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space[4] }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <Pressable key={n} onPress={() => onPick(n)} accessibilityRole="button" accessibilityLabel={`${n} puan`} accessibilityState={{ selected: current === n }}
              style={{ width: '18%', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
                borderColor: current === n ? color.primary : color.border, backgroundColor: current === n ? color.primary : color.surfaceSunken }}>
              <T v="label" c={current === n ? color.onPrimary : color.text} style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16 }}>{n}</T>
            </Pressable>
          ))}
        </View>
        {current ? <View style={{ marginTop: space[3] }}><Stars rating10={current} size={16} /></View> : null}
        <Button title="İnceleme de yaz" kind="secondary" onPress={onReview} style={{ marginTop: space[4] }} />
      </View>
    </Modal>
  );
}
