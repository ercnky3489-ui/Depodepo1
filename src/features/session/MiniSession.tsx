// Alt menünün üstündeki "okuyorsun" çubuğu: süren oturumu gösterir, dokununca oturuma döner.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Cover, T } from '../../components/ui';
import { haptic } from '../../lib/haptics';
import { color, radius, space } from '../../theme/tokens';
import { soundLabel } from './focusSounds';
import { elapsedMs, isRunning, toggleSession, useActiveSession } from './sessionStore';

function clock(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function MiniSession() {
  const s = useActiveSession();
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!s) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [s]);
  if (!s) return null;
  const run = isRunning(s);
  const sec = Math.floor(elapsedMs(s) / 1000);
  const detail = [run ? 'okuyorsun' : 'duraklatıldı', s.sound ? soundLabel(s.sound) : null, s.page ? `s. ${s.page}` : null].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={() => { haptic.select(); router.push(`/session/${s.mediaId}`); }} accessibilityRole="button"
      accessibilityLabel={`Okuma oturumu: ${s.title}, ${Math.floor(sec / 60)} dakika, ${detail}. Oturuma dön`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space[3], marginHorizontal: space[3], marginTop: space[2], marginBottom: 2,
        padding: 8, paddingRight: 10, borderRadius: radius.lg, backgroundColor: '#0F1A16', borderWidth: 1, borderColor: run ? 'rgba(0,229,160,0.45)' : '#22302A',
        shadowColor: color.primary, shadowOpacity: run ? 0.25 : 0, shadowRadius: 14, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <Cover id={s.mediaId} path={s.coverPath} title={s.title} width={34} radius={radius.xs} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="label" numberOfLines={1}>{s.title}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {run ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.primary }} /> : null}
          <T v="caption" c={run ? color.primary : color.textMuted} style={{ fontVariant: ['tabular-nums'] }} numberOfLines={1}>{clock(sec)} · {detail}</T>
        </View>
      </View>
      <Pressable onPress={(e) => { e.stopPropagation?.(); haptic.select(); toggleSession(); }} accessibilityRole="button" accessibilityLabel={run ? 'Oturumu duraklat' : 'Oturuma devam et'} hitSlop={6}
        style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.primary, transform: [{ scale: pressed ? 0.92 : 1 }] })}>
        <Svg width={16} height={16} viewBox="0 0 24 24">
          {run ? <><Rect x={6} y={5} width={4} height={14} rx={1.5} fill={color.onPrimary} /><Rect x={14} y={5} width={4} height={14} rx={1.5} fill={color.onPrimary} /></>
            : <Path d="M8 5.5v13l11-6.5z" fill={color.onPrimary} />}
        </Svg>
      </Pressable>
    </Pressable>
  );
}
