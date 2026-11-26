// XP sayacı, seviye çubuğu ve 3 boyutlu metalik rozet madalyası.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient as SvgGradient, RadialGradient, Stop, Path } from 'react-native-svg';
import { formatNumber } from '../lib/format';
import { haptic } from '../lib/haptics';
import { levelProgress } from '../lib/xp';
import { color, duration, radius, space } from '../theme/tokens';
import { T } from './ui';

// ---------------------------------------------------------------- XP sayacı
export function XPCard({ totalXp, xpToday, gain }: { totalXp: number; xpToday: number; gain?: { amount: number; reason: string } | null }) {
  const [shown, setShown] = useState(gain ? totalXp - gain.amount : totalXp);
  const raf = useRef<number | null>(null);
  const toast = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    if (!gain || gain.amount <= 0) { setShown(totalXp); return; }
    const from = totalXp - gain.amount;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      haptic.success();
      toast.value = withSequence(withTiming(1, { duration: duration.slow }), withDelay(2400, withTiming(0, { duration: duration.slow })));
      glow.value = withSequence(withTiming(1, { duration: 300 }), withDelay(1800, withTiming(0, { duration: 600 })));
      if (reduce) { setShown(totalXp); return; }
      const start = Date.now();
      const step = () => {
        const p = Math.min(1, (Date.now() - start) / duration.counter);
        const e = 1 - Math.pow(1 - p, 3);
        setShown(Math.round(from + gain.amount * e));
        if (p < 1 && !cancelled) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    });
    return () => { cancelled = true; if (raf.current) cancelAnimationFrame(raf.current); };
  }, [gain, totalXp, toast, glow]);

  const lp = levelProgress(shown);
  const toastStyle = useAnimatedStyle(() => ({ opacity: toast.value, transform: [{ translateY: (1 - toast.value) * 14 }] }));
  const glowStyle = useAnimatedStyle(() => ({ textShadowRadius: 22 * glow.value }));

  return (
    <View style={{ backgroundColor: color.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(0,229,160,0.28)', padding: 18, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <T v="overline" c={color.textMuted}>TOPLAM XP</T>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
            <Animated.Text accessibilityLiveRegion="polite" style={[{ fontFamily: 'Inter_800ExtraBold', fontSize: 44, lineHeight: 48, letterSpacing: -1.3, color: color.text, fontVariant: ['tabular-nums'], textShadowColor: 'rgba(0,229,160,0.75)' }, glowStyle]}>
              {formatNumber(shown)}
            </Animated.Text>
            <T v="label" c={color.primary} style={{ fontSize: 15 }}>XP</T>
          </View>
        </View>
        {gain ? (
          <Animated.View style={[{ height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,229,160,0.6)', backgroundColor: 'rgba(0,229,160,0.14)', justifyContent: 'center' }, toastStyle]}>
            <T v="label" c={color.primary} style={{ fontFamily: 'Inter_800ExtraBold' }}>+{gain.amount} XP · {gain.reason}</T>
          </Animated.View>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
        <T v="caption" style={{ fontFamily: 'Inter_700Bold' }}>Seviye {lp.level}</T>
        {lp.nextMin ? <T v="caption" c={color.textMuted}>Seviye {lp.level + 1} · {formatNumber(lp.nextMin)} XP</T> : <T v="caption" c={color.primary}>En üst seviye</T>}
      </View>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(lp.progress * 100) }}
        style={{ height: 12, borderRadius: 6, backgroundColor: color.surfaceSunken, marginTop: space[2], overflow: 'hidden' }}>
        <View style={{ width: `${lp.progress * 100}%`, height: 12, borderRadius: 6, backgroundColor: color.primary, shadowColor: color.primary, shadowOpacity: 0.7, shadowRadius: 14 }} />
      </View>
      {lp.nextMin ? (
        <T v="bodySm" style={{ marginTop: space[3] }}>
          <T v="bodySm" c={color.primary} style={{ fontFamily: 'Inter_700Bold' }}>{formatNumber(lp.remaining)} XP</T>
          <T v="bodySm" c={color.textSoft}> sonra Seviye {lp.level + 1}</T>
        </T>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: color.border }}>
        <T v="caption" c={color.textMuted}>Bugün</T>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: color.surfaceSunken }}>
          <View style={{ width: `${Math.min(100, (xpToday / 300) * 100)}%`, height: 6, borderRadius: 3, backgroundColor: '#2F6E5A' }} />
        </View>
        <T v="caption" c={color.textMuted}><T v="caption" style={{ fontFamily: 'Inter_700Bold' }}>{xpToday}</T> / 300 XP</T>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- rozet madalyası
const METALS = {
  3: ['#7A5A14', '#F3D27A', '#A87A1E', '#FFF1C1', '#8A6517', '#E9C25C'],
  2: ['#5E6B66', '#E6EFE9', '#8D9A94', '#FFFFFF', '#5D6964', '#CFD8D3'],
  1: ['#5A3216', '#D99A64', '#8A4F24', '#F2C49B', '#6B3A18', '#C98652'],
  0: [color.border, '#3A4741', '#222B27', '#4A5852', color.border, '#3A4741'],
} as const;

const BADGE_ICONS: Record<string, string> = {
  book: 'M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z',
  film: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM7 5v14M17 5v14',
  quote: 'M4 18v-5c0-4 2-7 6-8l1 2c-2 1-3 2.5-3 4h3v7zM13 18v-5c0-4 2-7 6-8l1 2c-2 1-3 2.5-3 4h3v7z',
  pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  tv: 'M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM17 2l-5 5-5-5',
  star: 'M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z',
  stack: 'M4 15h16v5H4zM5 9h14v5H5zM6 3h12v5H6z',
};

export function BadgeMedal({ icon, tier, size = 84, pop }: { icon: string; tier: 0 | 1 | 2 | 3; size?: number; pop?: boolean }) {
  const s = useSharedValue(pop ? 0.6 : 1);
  useEffect(() => { if (pop) s.value = withSpring(1, { damping: 9, stiffness: 140 }); }, [pop, s]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }, { rotate: `${(1 - s.value) * -20}deg` }] }));
  const m = METALS[tier];
  const ink = tier === 0 ? color.textFaint : color.primary;
  const id = `m${tier}${icon}`;
  return (
    <Animated.View style={[{ width: size, height: size, opacity: tier === 0 ? 0.55 : 1,
      shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 12 }, elevation: 8 }, anim]}>
      <Svg width={size} height={size} viewBox="0 0 84 84">
        <Defs>
          <SvgGradient id={`${id}ring`} x1="0" y1="0" x2="1" y2="1">
            {m.map((c, i) => <Stop key={i} offset={i / (m.length - 1)} stopColor={c} />)}
          </SvgGradient>
          <RadialGradient id={`${id}core`} cx="50%" cy="35%" r="65%">
            <Stop offset="0" stopColor="#16241F" /><Stop offset="0.75" stopColor="#070B0A" />
          </RadialGradient>
        </Defs>
        <Circle cx={42} cy={42} r={42} fill={`url(#${id}ring)`} />
        <Circle cx={42} cy={42} r={31} fill={`url(#${id}core)`} />
        {tier > 0 ? <Circle cx={42} cy={42} r={31} fill="none" stroke={color.primary} strokeOpacity={0.35} strokeWidth={3} /> : null}
        <Ellipse cx={34} cy={16} rx={19} ry={7} fill="#fff" opacity={0.3} transform="rotate(-20 34 16)" />
        <Path d={BADGE_ICONS[icon] ?? BADGE_ICONS.star!} transform="translate(28 28) scale(1.17)" fill={icon === 'quote' ? ink : 'none'} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

export const TIER_LABEL = ['KİLİTLİ', 'BRONZ', 'GÜMÜŞ', 'ALTIN'] as const;
export const TIER_COLOR = [color.textFaint, color.metalBronze, color.metalSilver, color.metalGold] as const;

export function nextTierText(progress: number, tiers: number[], tier: number, unit: string): string {
  if (tier >= 3) return 'En üst kademe';
  const target = tiers[tier] ?? 0;
  return `${TIER_LABEL[tier + 1]?.toLocaleLowerCase('tr-TR')} için ${Math.max(0, target - progress)} ${unit}`;
}

