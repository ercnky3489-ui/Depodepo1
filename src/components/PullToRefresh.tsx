// Çek-yenile: liste en üstteyken aşağı çekince kitap sayfası çevrilir gibi bir gösterge belirir;
// bırakınca yenilenir ve bitince kitap sesi çalar. Web'de dokunma olaylarıyla çalışır (telefon tarayıcısı ve
// ana ekrana eklenen uygulama); mağaza uygulamasında yerleşik RefreshControl kullanılır.
import { useRef, useState, type ReactNode } from 'react';
import { Platform, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { haptic } from '../lib/haptics';
import { playNotifySound } from '../lib/notifySound';
import { color } from '../theme/tokens';

const TRIGGER = 64;   // bu kadar çekilince bırakınca yenilenir
const HOLD = 52;      // yenilenirken göstergenin yüksekliği

type Props = { onRefresh: () => Promise<unknown>; children: (onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void) => ReactNode };

// Web'de dokunma konumu olayın kendisinde değil, touches[0] içinde gelir
const touchY = (e: { nativeEvent: { pageY?: number; touches?: ArrayLike<{ pageY: number }>; changedTouches?: ArrayLike<{ pageY: number }> } }) =>
  e.nativeEvent.touches?.[0]?.pageY ?? e.nativeEvent.changedTouches?.[0]?.pageY ?? e.nativeEvent.pageY ?? 0;

export function PullToRefresh({ onRefresh, children }: Props) {
  const atTop = useRef(true);
  const startY = useRef<number | null>(null);
  const armed = useRef(false);
  const pull = useSharedValue(0);
  const spin = useSharedValue(0);
  const [busy, setBusy] = useState(false);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => { atTop.current = e.nativeEvent.contentOffset.y <= 2; };

  const end = async () => {
    startY.current = null;
    if (busy) return;
    if (pull.value >= TRIGGER) {
      setBusy(true); haptic.page();
      pull.value = withTiming(HOLD, { duration: 180 });
      spin.value = 0; spin.value = withRepeat(withTiming(1, { duration: 650, easing: Easing.linear }), -1, false);
      try { await onRefresh(); } catch { /* hata listede görünür */ }
      playNotifySound(0.4);
      cancelAnimation(spin); spin.value = 0;
      pull.value = withTiming(0, { duration: 260 });
      setBusy(false);
    } else pull.value = withTiming(0, { duration: 200 });
    armed.current = false;
  };

  const page = useAnimatedStyle(() => ({
    transform: [{ perspective: 120 }, { rotateY: `${busy ? -spin.value * 360 : -Math.min(1, pull.value / TRIGGER) * 180}deg` }],
    opacity: Math.min(1, pull.value / 30),
  }));
  const holder = useAnimatedStyle(() => ({ height: pull.value }));
  const body = useAnimatedStyle(() => ({ transform: [{ translateY: pull.value }] }));

  if (Platform.OS !== 'web') return <>{children(onScroll)}</>;
  return (
    <View style={{ flex: 1, overflow: 'hidden' }}
      onTouchStart={(e) => { if (atTop.current && !busy) startY.current = touchY(e as never); }}
      onTouchMove={(e) => {
        if (startY.current === null || busy) return;
        const dy = touchY(e as never) - startY.current;
        if (dy <= 0 || !atTop.current) { pull.value = 0; return; }
        pull.value = Math.min(110, dy * 0.5);
        if (pull.value >= TRIGGER && !armed.current) { armed.current = true; haptic.select(); }
        if (pull.value < TRIGGER) armed.current = false;
      }}
      onTouchEnd={end} onTouchCancel={end}>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, holder]}
        accessibilityLabel={busy ? 'Yenileniyor' : undefined} accessibilityLiveRegion="polite">
        <Animated.View style={[{ width: 22, height: 28, borderTopRightRadius: 5, borderBottomRightRadius: 5, borderTopLeftRadius: 2, borderBottomLeftRadius: 2,
          backgroundColor: '#EAF3EE', borderLeftWidth: 3, borderLeftColor: color.primary, paddingTop: 6, paddingHorizontal: 4, gap: 3, transformOrigin: 'left center' } as object, page]}>
          {[0, 1, 2].map((i) => <View key={i} style={{ height: 2, backgroundColor: '#9FB3AA', borderRadius: 1 }} />)}
        </Animated.View>
      </Animated.View>
      <Animated.View style={[{ flex: 1 }, body]}>{children(onScroll)}</Animated.View>
    </View>
  );
}
