import * as WebBrowser from 'expo-web-browser';
import { Pressable, View } from 'react-native';
import { IMDB_ENABLED } from '../lib/supabase';
import { formatNumber, formatRating } from '../lib/format';
import { color, radius, space } from '../theme/tokens';
import type { MediaDetail } from '../types/db';
import { IconStar } from './icons';
import { T } from './ui';

// IMDb, BOOKFLIX ve kullanıcının puanı her zaman ayrı kutularda; asla tek sayıda birleşmez.
export function RatingRow({ media, myRating, onRate }: { media: MediaDetail; myRating: number | null; onRate: () => void }) {
  const imdb = media.external_ratings.find((r) => r.source === 'imdb');
  const gb = media.external_ratings.find((r) => r.source === 'google_books');
  const stats = media.media_stats;
  const enough = (stats?.user_rating_count ?? 0) >= 5;
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        {IMDB_ENABLED && imdb ? (
          <Box>
            <View style={{ alignSelf: 'flex-start', backgroundColor: color.imdb, borderRadius: 4, paddingHorizontal: 5 }}>
              <T v="overline" c={color.onPrimary}>IMDb</T>
            </View>
            <T v="statMd" style={{ marginTop: space[2] }}>{formatRating(imdb.value)}<T v="caption" c={color.textMuted}>/10</T></T>
            <T v="caption" c={color.textMuted}>IMDb kullanıcıları</T>
          </Box>
        ) : null}
        {gb ? (
          <Pressable style={{ flex: 1 }} onPress={() => WebBrowser.openBrowserAsync(gb.attribution_url)} accessibilityRole="link"
            accessibilityLabel={`Google Books puanı ${formatRating(gb.value)}, 5 üzerinden. Google Books'ta aç.`}>
            <Box>
              <T v="overline" c={color.textSoft}>GOOGLE BOOKS</T>
              <T v="statMd" style={{ marginTop: space[2] }}>{formatRating(gb.value)}<T v="caption" c={color.textMuted}>/5</T></T>
              <T v="caption" c={color.textMuted}>{gb.vote_count ? `${formatNumber(gb.vote_count)} oy` : 'Harici puan'}</T>
            </Box>
          </Pressable>
        ) : null}
        <Box accent>
          <T v="overline">BOOK<T v="overline" c={color.primary}>FLIX</T></T>
          {enough ? (
            <>
              <T v="statMd" c={color.primary} style={{ marginTop: space[2] }}>{formatRating(stats?.user_rating_avg)}<T v="caption" c={color.textMuted}>/10</T></T>
              <T v="caption" c={color.textMuted}>{formatNumber(stats?.user_rating_count ?? 0)} oy</T>
            </>
          ) : (
            <T v="caption" c={color.textMuted} style={{ marginTop: space[2] }}>Henüz yeterli oy yok</T>
          )}
        </Box>
        <Pressable style={{ flex: 1 }} onPress={onRate} accessibilityRole="button" accessibilityLabel={myRating ? `Puanın ${myRating}. Değiştir.` : 'Puan ver'}>
          <View style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, padding: space[3] }}>
            <T v="overline" c={color.textMuted}>SENİN PUANIN</T>
            <T v="statMd" c={myRating ? color.text : color.textFaint} style={{ marginTop: space[2] }}>{myRating ?? '—'}</T>
            <T v="caption" c={color.primary}>{myRating ? 'Değiştir' : 'Puan ver'}</T>
          </View>
        </Pressable>
      </View>
      <T v="caption" c={color.textFaint} style={{ marginTop: space[2] }}>
        Harici puanlar kaynaklarına aittir; BOOKFLIX puanı yalnızca uygulama kullanıcılarının oylarından hesaplanır.
      </T>
    </View>
  );
}

function Box({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <View style={{ flex: 1, borderRadius: 16, padding: space[3], borderWidth: 1,
      backgroundColor: accent ? 'rgba(0,229,160,0.07)' : color.surface, borderColor: accent ? 'rgba(0,229,160,0.35)' : color.border }}>
      {children}
    </View>
  );
}

export function Stars({ rating10, size = 13 }: { rating10: number; size?: number }) {
  const full = Math.round(rating10 / 2);
  return (
    <View style={{ flexDirection: 'row', gap: 2 }} accessible accessibilityLabel={`5 üzerinden ${full} yıldız`}>
      {[1, 2, 3, 4, 5].map((i) => <IconStar key={i} size={size} fill={i <= full ? color.primary : color.borderStrong} c={i <= full ? color.primary : color.borderStrong} />)}
    </View>
  );
}

export function RatingPill({ value }: { value: number }) {
  return (
    <View style={{ backgroundColor: color.primary, borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 4 }}>
      <T v="label" c={color.onPrimary} style={{ fontFamily: 'Inter_800ExtraBold' }}>{value}/10</T>
    </View>
  );
}
