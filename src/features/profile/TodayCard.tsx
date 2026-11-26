// Profilin en üstünde (yalnızca kendi profilinde): canlı özet + hedef halkaları + seri dondurucu.
//   Halkalar: günlük dakika · haftalık sayfa · yıllık kitap
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { celebrate } from '../../components/Confetti';
import { Flame } from '../../components/Streak';
import { Button, Cover, T } from '../../components/ui';
import { haptic } from '../../lib/haptics';
import { errorMessage, supabase } from '../../lib/supabase';
import { color, radius, space } from '../../theme/tokens';
import { elapsedMs, useActiveSession } from '../session/sessionStore';

type Today = {
  today_minutes: number; week_pages: number; year_books: number; goal_minutes: number; goal_pages: number; goal_books: number | null;
  streak: { current: number; best: number; today: boolean } | null;
  freeze: { remaining: number; can_use: boolean; missed_day: string };
  current: { media_id: string; title: string; cover_path: string | null; current_page: number | null; page_count: number | null } | null;
};

export function useReadingToday(enabled: boolean) {
  return useQuery({
    queryKey: ['readingToday'], enabled, staleTime: 15_000,
    queryFn: async () => { const { data, error } = await supabase.rpc('reading_today'); if (error) throw error; return data as Today; },
  });
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
function Ring({ r, value, tint, delay }: { r: number; value: number; tint: string; delay: number }) {
  const L = 2 * Math.PI * r;
  const p = useSharedValue(0);
  useEffect(() => { p.value = 0; p.value = withDelay(delay, withTiming(Math.min(1, value), { duration: 1100, easing: Easing.out(Easing.cubic) })); }, [value, delay, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: L * (1 - p.value) }));
  return (
    <>
      <Circle cx={60} cy={60} r={r} stroke={tint} strokeOpacity={0.16} strokeWidth={10} fill="none" />
      <AnimatedCircle cx={60} cy={60} r={r} stroke={tint} strokeWidth={10} fill="none" strokeLinecap="round"
        strokeDasharray={`${L} ${L}`} transform="rotate(-90 60 60)" animatedProps={props} />
    </>
  );
}

export function TodayCard() {
  const qc = useQueryClient();
  const q = useReadingToday(true);
  const active = useActiveSession();
  const [, tick] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!active?.since) return; const t = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(t); }, [active?.since]);
  const d = q.data;
  if (!d) return null;

  const liveMin = active ? Math.floor(elapsedMs(active) / 60000) : 0; // süren (henüz kaydedilmemiş) oturum da sayılsın
  const minutes = d.today_minutes + liveMin;
  const rings = [
    { label: 'dk bugün', value: minutes, goal: d.goal_minutes, tint: color.primary },
    { label: 'sayfa bu hafta', value: d.week_pages, goal: d.goal_pages, tint: '#5FE0FF' },
    { label: 'kitap bu yıl', value: d.year_books, goal: d.goal_books ?? 0, tint: '#FFB86B' },
  ];
  const cur = d.current;
  const pct = cur?.current_page && cur.page_count ? Math.min(1, cur.current_page / cur.page_count) : 0;

  const freeze = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('use_streak_freeze');
    setBusy(false);
    if (error) { Alert.alert('Dondurucu kullanılamadı', errorMessage(error)); return; }
    haptic.streak(); celebrate();
    ['readingToday', 'streak'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  return (
    <View style={{ marginHorizontal: space[4], marginTop: space[4], padding: space[4], borderRadius: radius.lg, backgroundColor: color.surface,
      borderWidth: 1, borderColor: 'rgba(0,229,160,0.32)', gap: space[4] }}>
      {d.freeze.can_use ? (
        <View style={{ padding: space[3], borderRadius: radius.md, backgroundColor: 'rgba(120,200,255,0.12)', borderWidth: 1, borderColor: 'rgba(120,200,255,0.35)', gap: space[2] }}>
          <T v="label">🧊 Dün okuyamadın, serin bozuldu</T>
          <T v="bodySm" c={color.textSoft}>Seri dondurucu dünü korur ve serin kaldığı yerden devam eder. Bu ay {d.freeze.remaining} hakkın var.</T>
          {d.freeze.remaining > 0 ? <Button title="Dondurucu kullan" onPress={freeze} loading={busy} /> : <T v="caption" c={color.textMuted}>Bu ayki hakların bitti; ayın 1'inde yenilenir.</T>}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
        <Svg width={120} height={120} viewBox="0 0 120 120" accessibilityLabel={rings.map((r) => `${r.value} / ${r.goal || '—'} ${r.label}`).join(', ')}>
          <Ring r={52} value={rings[0]!.goal ? rings[0]!.value / rings[0]!.goal : 0} tint={rings[0]!.tint} delay={0} />
          <Ring r={39} value={rings[1]!.goal ? rings[1]!.value / rings[1]!.goal : 0} tint={rings[1]!.tint} delay={150} />
          <Ring r={26} value={rings[2]!.goal ? rings[2]!.value / rings[2]!.goal : 0} tint={rings[2]!.tint} delay={300} />
        </Svg>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Flame size={22} lit={!!d.streak?.today} />
            <T style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 22, color: color.text }}>{d.streak?.current ?? 0}</T>
            <T v="caption" c={color.textMuted}>günlük seri{d.freeze.remaining < 2 ? ` · 🧊 ${d.freeze.remaining}` : ''}</T>
          </View>
          {rings.map((r) => (
            <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.tint }} />
              <T v="caption" c={color.textSoft} style={{ fontVariant: ['tabular-nums'] }}>
                <T v="label" style={{ fontSize: 13 }}>{r.value}</T>{r.goal ? ` / ${r.goal}` : ''} {r.label}
              </T>
            </View>
          ))}
        </View>
      </View>

      {cur ? (
        <Pressable onPress={() => router.push(`/media/${cur.media_id}`)} accessibilityRole="link" accessibilityLabel={`${cur.title}, sayfa ${cur.current_page ?? 0}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Cover id={cur.media_id} path={cur.cover_path} title={cur.title} width={40} radius={radius.xs} />
          <View style={{ flex: 1, gap: 4 }}>
            <T v="label" numberOfLines={1}>{cur.title}</T>
            <T v="caption" c={color.textMuted}>Sayfa {cur.current_page ?? 0}{cur.page_count ? ` / ${cur.page_count}` : ''}</T>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: color.surfaceSunken }}>
              <View style={{ height: 5, borderRadius: 3, width: `${pct * 100}%`, backgroundColor: color.primary }} />
            </View>
          </View>
          <Button title="Devam" kind="secondary" onPress={() => router.push(`/session/${cur.media_id}`)} style={{ minHeight: 38 }} />
        </Pressable>
      ) : null}
    </View>
  );
}
