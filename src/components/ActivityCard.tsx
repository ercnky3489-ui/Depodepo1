// Ana akış kartları. Her aktivite türünün kendi görsel hiyerarşisi var:
// büyük (alıntı, izlenen film, bitirilen kitap) · orta (inceleme, dizi, liste) · küçük (takip, beğeni, başlama).
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useToggleHelpful, useToggleLike, useToggleSave } from '../api/feed';
import { relativeTime } from '../lib/format';
import { imageUrl } from '../lib/images';
import { color, radius, space } from '../theme/tokens';
import type { FeedItem } from '../types/db';
import { IconBookmark, IconComment, IconFilm, IconHeart, IconMore, IconShare, IconThumb } from './icons';
import { RatingPill, Stars } from './Ratings';
import { SpoilerVeil } from './SpoilerVeil';
import { Avatar, Card, Cover, T } from './ui';
import { Image } from 'expo-image';

const VERB_TEXT: Record<string, string> = {
  started_reading: 'okumaya başladı',
  finished_book: 'bir kitabı bitirdi',
  watched_movie: 'bir film izledi',
  watching_series: 'dizi izliyor',
  finished_series: 'bir diziyi bitirdi',
  quoted: 'bir alıntı paylaştı',
  reviewed: 'bir inceleme yazdı',
  liked: 'bir paylaşımı beğendi',
  followed: 'takip etmeye başladı',
  created_list: 'yeni bir liste oluşturdu',
};

function Meta({ item, size = 34, right, onMore }: { item: FeedItem; size?: number; right?: React.ReactNode; onMore?: () => void }) {
  const name = item.actor.display_name ?? item.actor.username ?? '';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] + 2 }}>
      <Pressable onPress={() => router.push(`/user/${item.actor.id}`)} accessibilityRole="link" accessibilityLabel={`${name} profili`}>
        <Avatar name={name} path={item.actor.avatar_path} size={size} />
      </Pressable>
      <T v="bodySm" c={color.textMuted} style={{ flex: 1, fontSize: 13 }}>
        <T v="label" style={{ fontSize: 13 }}>{name}</T>
        {item.verb === 'followed' && item.target_user ? `, ${item.target_user.display_name ?? item.target_user.username}'i ` : ' '}
        {VERB_TEXT[item.verb]} · {relativeTime(item.created_at)}
      </T>
      {right}
      {onMore ? <Pressable onPress={onMore} hitSlop={12} accessibilityRole="button" accessibilityLabel="Diğer seçenekler"><IconMore /></Pressable> : null}
    </View>
  );
}

function Actions({ item, type }: { item: FeedItem; type: 'quote' | 'review' | 'list' }) {
  const like = useToggleLike();
  const save = useToggleSave();
  const id = item.object?.id;
  if (!id) return null;
  const liked = item.liked_by_me;
  return (
    <View style={styles.actions}>
      <Pressable style={styles.act} onPress={() => like.mutate({ type, id })} accessibilityRole="button"
        accessibilityState={{ selected: liked }} accessibilityLabel={liked ? 'Beğeniyi geri al' : 'Beğen'}>
        <IconHeart fill={liked ? color.primary : 'none'} c={liked ? color.primary : color.textMuted} />
        <T v="label" c={liked ? color.primary : color.textMuted}>{item.object?.like_count ?? 0}</T>
      </Pressable>
      {type !== 'list' ? (
        <Pressable style={styles.act} onPress={() => router.push(`/${type}/${id}`)} accessibilityRole="button" accessibilityLabel={`Yorumlar, ${item.object?.comment_count ?? 0}`}>
          <IconComment /><T v="label" c={color.textMuted}>{item.object?.comment_count ?? 0}</T>
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }} />
      <Pressable style={styles.act} onPress={() => save.mutate({ type, id, saved: item.saved_by_me })} accessibilityRole="button"
        accessibilityState={{ selected: item.saved_by_me }} accessibilityLabel={item.saved_by_me ? 'Kaydedildi, kaldır' : 'Kaydet'}>
        <IconBookmark fill={item.saved_by_me ? color.primary : 'none'} c={item.saved_by_me ? color.primary : color.textMuted} />
      </Pressable>
      <Pressable style={styles.act} accessibilityRole="button" accessibilityLabel="Paylaş"
        onPress={() => Share.share({ message: `BOOKFLIX'te bak: bookflix://${type}/${id}` })}>
        <IconShare />
      </Pressable>
    </View>
  );
}

function QuoteCard({ item }: { item: FeedItem }) {
  const q = item.object!;
  const isBook = item.media?.kind === 'book';
  const source = isBook
    ? `${item.media?.authors?.[0] ?? ''}${q.page_number && !q.hide_page ? ` · Sayfa ${q.page_number}` : ''}`
    : q.scene_note ?? '';
  const body = q.has_spoiler ? <SpoilerVeil text={q.body ?? ''} /> : (
    <T v={isBook ? 'quoteLg' : 'quoteMd'} style={[{ marginTop: space[2] }, !isBook && { borderLeftWidth: 2, borderLeftColor: color.accent, paddingLeft: space[3], marginTop: space[4] }]}>
      {q.body}
    </T>
  );
  return (
    <Card style={{ paddingBottom: space[1] }} >
      <Meta item={item} right={isBook ? <Tag text="ALINTI" /> : <IconFilm />} />
      {isBook ? <T v="displayXl" c={color.primary} style={styles.quoteMark} accessibilityElementsHidden importantForAccessibility="no">“</T> : null}
      {body}
      <Pressable onPress={() => item.media && router.push(`/media/${item.media.id}`)} style={styles.source} accessibilityRole="link">
        {item.media ? <Cover id={item.media.id} path={item.media.cover_path} width={30} /> : null}
        <View style={{ flex: 1 }}>
          <T v="label">{item.media?.title}</T>
          <T v="caption" c={color.textMuted}>{source}</T>
        </View>
      </Pressable>
      <Actions item={item} type="quote" />
    </Card>
  );
}

function ReviewCard({ item }: { item: FeedItem }) {
  const r = item.object!;
  const helpful = useToggleHelpful();
  const kindLabel = item.media?.kind === 'book' ? 'KİTAP İNCELEMESİ' : item.media?.kind === 'series' ? 'DİZİ İNCELEMESİ' : 'FİLM İNCELEMESİ';
  return (
    <Card style={{ paddingBottom: space[1] }}>
      <Meta item={item} />
      <Pressable style={{ flexDirection: 'row', gap: space[3], marginTop: space[3] }} onPress={() => router.push(`/review/${r.id}`)} accessibilityRole="link">
        {item.media ? <Cover id={item.media.id} path={item.media.cover_path} width={54} title={item.media.title} /> : null}
        <View style={{ flex: 1 }}>
          <T v="overline" c={color.accent}>{`${kindLabel} · ${item.media?.title ?? ''}`.toLocaleUpperCase('tr-TR')}</T>
          {r.title ? <T v="titleSm" style={{ marginTop: 4 }}>{r.title}</T> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space[2] }}>
            <T v="label" c={color.primary}>{r.rating}/10</T><Stars rating10={r.rating ?? 0} />
          </View>
        </View>
      </Pressable>
      {r.has_spoiler ? <SpoilerVeil text={r.body ?? ''} /> : <T v="bodySm" c="#D5DED9" numberOfLines={5} style={{ marginTop: space[3] }}>{r.body}</T>}
      <View style={styles.actions}>
        <Pressable style={styles.act} onPress={() => helpful.mutate(r.id!)} accessibilityRole="button" accessibilityLabel={`Faydalı, ${r.helpful_count ?? 0}`}>
          <IconThumb /><T v="label" c={color.textMuted}>Faydalı · {r.helpful_count ?? 0}</T>
        </Pressable>
      </View>
      <Actions item={item} type="review" />
    </Card>
  );
}

function WatchedCard({ item }: { item: FeedItem }) {
  const m = item.media!;
  const backdrop = imageUrl(m.backdrop_path ?? m.cover_path);
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={{ padding: space[4] }}>
        <Meta item={item} right={item.object?.rating ? <RatingPill value={item.object.rating} /> : null} />
      </View>
      <Pressable onPress={() => router.push(`/media/${m.id}`)} accessibilityRole="link" accessibilityLabel={`${m.title} detayına git`}
        style={{ height: 210, backgroundColor: '#071A1C' }}>
        {backdrop ? <Image source={{ uri: backdrop }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
        <LinearGradient colors={['rgba(7,26,28,0)', 'rgba(8,11,10,0.95)']} style={[StyleSheet.absoluteFill, { top: 90 }]} />
        <View style={{ position: 'absolute', left: space[4], bottom: 14 }}>
          <T v="displayLg" style={{ fontSize: 30 }}>{m.title}</T>
          {m.year ? <T v="caption" c={color.textSoft}>{m.year}</T> : null}
        </View>
      </Pressable>
      <View style={{ height: space[3] }} />
    </Card>
  );
}

function FinishedBookCard({ item }: { item: FeedItem }) {
  const m = item.media!;
  const started = item.object?.started_at ? new Date(item.object.started_at) : null;
  const finished = item.object?.finished_at ? new Date(item.object.finished_at) : null;
  const days = started && finished ? Math.max(1, Math.round((finished.getTime() - started.getTime()) / 86400000)) : null;
  return (
    <Card highlight>
      <Meta item={item} right={<Tag text="BİTİRDİ" solid />} />
      <Pressable onPress={() => router.push(`/media/${m.id}`)} style={{ flexDirection: 'row', gap: space[4], marginTop: space[4], alignItems: 'flex-end' }} accessibilityRole="link">
        <Cover id={m.id} path={m.cover_path} title={m.title} width={118} radius={8} shadow />
        <View style={{ flex: 1 }}>
          <T v="titleLg" style={{ fontSize: 22, lineHeight: 26 }}>{m.title}</T>
          <T v="bodySm" c={color.textMuted}>{m.authors?.join(', ')}</T>
          {item.object?.rating ? <View style={{ marginTop: space[3] }}><Stars rating10={item.object.rating} size={16} /></View> : null}
          <View style={{ flexDirection: 'row', gap: space[4], marginTop: space[3] }}>
            {days ? <Stat n={days} l="gün" /> : null}
            {m.page_count ? <Stat n={m.page_count} l="sayfa" /> : null}
          </View>
        </View>
      </Pressable>
    </Card>
  );
}

function ProgressCard({ item }: { item: FeedItem }) {
  const m = item.media!;
  const isSeries = m.kind === 'series';
  const page = item.object?.current_page;
  const pct = !isSeries && page && m.page_count ? Math.min(1, page / m.page_count) : null;
  return (
    <Card style={{ paddingVertical: 14 }}>
      <Meta item={item} size={24} />
      <Pressable onPress={() => router.push(`/media/${m.id}`)} style={{ flexDirection: 'row', gap: space[3], marginTop: space[3], alignItems: 'center' }} accessibilityRole="link">
        <Cover id={m.id} path={m.cover_path} width={46} />
        <View style={{ flex: 1 }}>
          <T v="titleSm">{m.title}</T>
          <T v="caption" c={isSeries ? color.accent : color.textMuted}>{isSeries ? 'İzlemeye devam ediyor' : m.authors?.join(', ')}</T>
          {pct !== null ? (
            <>
              <View style={styles.track}><View style={[styles.fill, { width: `${pct * 100}%` }]} /></View>
              <T v="caption" c={color.textMuted} style={{ marginTop: 4, fontSize: 11 }}>Sayfa {page} / {m.page_count}</T>
            </>
          ) : null}
        </View>
      </Pressable>
    </Card>
  );
}

function ListCard({ item }: { item: FeedItem }) {
  const l = item.object!;
  const covers = (l.covers ?? []).slice(0, 4);
  return (
    <Card style={{ paddingBottom: space[1] }}>
      <Meta item={item} />
      <Pressable onPress={() => router.push(`/list/${l.id}`)} accessibilityRole="link">
        <View style={{ flexDirection: 'row', marginTop: space[4], height: 120, alignItems: 'center', paddingLeft: 6 }}>
          {covers.map((c, i) => (
            <View key={i} style={{ marginLeft: i ? -26 : 0, transform: [{ rotate: `${[-8, -3, 3, 8][i]}deg` }] }}>
              <Cover id={`${l.id}${i}`} path={c} width={74} shadow />
            </View>
          ))}
          <View style={{ marginLeft: space[4] }}>
            <T v="statMd" c={color.primary}>{l.item_count ?? 0}</T>
            <T v="caption" c={color.textMuted}>eser</T>
          </View>
        </View>
        <T v="titleSm" style={{ marginTop: space[3], fontSize: 19 }}>{l.title}</T>
      </Pressable>
      <Actions item={item} type="list" />
    </Card>
  );
}

function SmallRow({ item }: { item: FeedItem }) {
  return <View style={{ paddingHorizontal: space[1], minHeight: 44, justifyContent: 'center' }}><Meta item={item} size={26} /></View>;
}

function Tag({ text, solid }: { text: string; solid?: boolean }) {
  return (
    <View style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: solid ? color.primary : 'rgba(0,229,160,0.4)', backgroundColor: solid ? color.primary : 'transparent' }}>
      <T v="overline" c={solid ? color.onPrimary : color.primary}>{text}</T>
    </View>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return <View><T v="statMd" style={{ fontSize: 17, lineHeight: 20 }}>{n}</T><T v="caption" c={color.textMuted} style={{ fontSize: 11 }}>{l}</T></View>;
}

export const ActivityCard = memo(function ActivityCard({ item }: { item: FeedItem }) {
  switch (item.verb) {
    case 'quoted': return item.object ? <QuoteCard item={item} /> : null;
    case 'reviewed': return item.object ? <ReviewCard item={item} /> : null;
    case 'watched_movie':
    case 'finished_series': return item.media ? <WatchedCard item={item} /> : null;
    case 'finished_book': return item.media ? <FinishedBookCard item={item} /> : null;
    case 'started_reading':
    case 'watching_series': return item.media ? <ProgressCard item={item} /> : null;
    case 'created_list': return item.object ? <ListCard item={item} /> : null;
    default: return <SmallRow item={item} />;
  }
});

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: space[1], marginLeft: -10 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, minWidth: 44, paddingHorizontal: 10, justifyContent: 'center' },
  quoteMark: { fontSize: 64, lineHeight: 52, marginTop: space[4], height: 34, textShadowColor: 'rgba(0,229,160,0.5)', textShadowRadius: 18 },
  source: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: 18, padding: 10, borderRadius: 14, backgroundColor: color.surfaceSunken },
  track: { height: 4, backgroundColor: color.border, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: color.primary, borderRadius: 2 },
});

export { Tag };
