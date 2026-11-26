// Okuma serisi: ana sayfada alevli küçük rozet, profilde kilometre taşlı kart.
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Streak } from '../api/profileDetails';
import { color, space } from '../theme/tokens';
import { Card, Overline, T } from './ui';

export const MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const;
export const MILESTONE_XP = 25;

export function Flame({ size = 18, lit = true }: { size?: number; lit?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z" fill={lit ? '#FF9F43' : color.borderStrong} />
      <Path d="M12 12c.6 1.8 2.5 2.4 2.5 4.3a2.5 2.5 0 0 1-5 0c0-1.2.7-2 1.3-2.6.2 1 .7 1.4 1.2 1.4 0-1.2-.3-2 0-3.1z" fill={lit ? '#FFE08A' : '#55665F'} />
    </Svg>
  );
}

export function StreakChip({ streak }: { streak: Streak | null | undefined }) {
  const n = streak?.current ?? 0;
  const lit = !!streak?.today;
  return (
    <Pressable onPress={() => router.push('/(tabs)/profile')} accessibilityRole="button"
      accessibilityLabel={`${n} günlük okuma serisi${lit ? ', bugün okudun' : ', bugün henüz okumadın'}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 10, borderRadius: 16, marginRight: 4,
        backgroundColor: lit ? 'rgba(255,159,67,0.14)' : color.surface, borderWidth: 1, borderColor: lit ? 'rgba(255,159,67,0.5)' : color.borderStrong }}>
      <Flame lit={lit || n > 0} />
      <T v="label" c={lit ? '#FFB86B' : color.textMuted} style={{ fontFamily: 'Inter_800ExtraBold', fontVariant: ['tabular-nums'] }}>{n}</T>
    </Pressable>
  );
}

export function StreakCard({ streak, own }: { streak: Streak | null | undefined; own: boolean }) {
  if (!streak) return null;
  const n = streak.current;
  const next = MILESTONES.find((m) => m > n);
  const status = streak.today ? 'Bugün okudun, serin güvende.'
    : n > 0 ? (own ? 'Bugün bir oturum aç, serin bozulmasın.' : 'Serisi sürüyor.')
      : own ? 'Bir okuma oturumu başlat, serin başlasın.' : 'Henüz okuma serisi yok.';
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Overline>Okuma serisi</Overline>
        <T v="caption" c={color.textMuted}>En iyi {streak.best} gün</T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[2] }}>
        <Flame size={40} lit={n > 0} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 30, lineHeight: 34, color: color.text }}>{n} gün</T>
          <T v="caption" c={streak.today ? '#FFB86B' : color.textMuted}>{status}</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[4] }}
        accessible accessibilityLabel={`Kilometre taşları: ${MILESTONES.join(', ')} gün`}>
        {MILESTONES.map((m) => {
          const done = n >= m || streak.best >= m;
          return (
            <View key={m} style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                backgroundColor: done ? 'rgba(255,159,67,0.18)' : 'transparent', borderWidth: 1.5, borderColor: done ? '#FF9F43' : color.borderStrong }}>
                <T style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: done ? '#FFB86B' : color.textFaint }}>{m}</T>
              </View>
            </View>
          );
        })}
      </View>
      {next ? <T v="caption" c={color.textMuted} style={{ marginTop: space[3] }}>{next} güne {next - n} gün kaldı · ödül +{MILESTONE_XP} XP</T> : null}
      {own && !streak.today ? (
        <T v="caption" c={color.textFaint} style={{ marginTop: space[2] }}>İpucu: Bir kitabın sayfasından "Okuma oturumu başlat"a dokun.</T>
      ) : null}
    </Card>
  );
}
