// Kaydırarak işlem: akış kartını sağa kaydır → beğen, sola kaydır → kitabı "Okuyacağım"a ekle.
// Yalnızca belirgin yatay harekette devreye girer; dikey kaydırma (akışta gezinme) etkilenmez.
import { useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { haptic } from '../lib/haptics';
import { color, radius } from '../theme/tokens';
import { T } from './ui';

const LIMIT = 84;

type Props = {
  children: ReactNode;
  right?: { label: string; done: string; onAction: () => void } | null;   // sağa kaydırınca
  left?: { label: string; done: string; onAction: () => void } | null;    // sola kaydırınca
};

export function SwipeRow({ children, right, left }: Props) {
  const x = useRef(new Animated.Value(0)).current;
  const [dir, setDir] = useState<0 | 1 | -1>(0);
  const [doneSide, setDoneSide] = useState<0 | 1 | -1>(0);
  const armed = useRef(false);
  const cfg = useRef({ right, left }); cfg.current = { right, left };

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6
      && ((g.dx > 0 && !!cfg.current.right) || (g.dx < 0 && !!cfg.current.left)),
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { armed.current = false; setDoneSide(0); },
    onPanResponderMove: (_e, g) => {
      const allowed = (g.dx > 0 && cfg.current.right) || (g.dx < 0 && cfg.current.left);
      const v = allowed ? Math.max(-140, Math.min(140, g.dx)) : 0;
      x.setValue(v); setDir(v > 0 ? 1 : v < 0 ? -1 : 0);
      const over = Math.abs(v) >= LIMIT;
      if (over !== armed.current) { armed.current = over; if (over) haptic.select(); }
    },
    onPanResponderRelease: (_e, g) => {
      const side = g.dx >= LIMIT && cfg.current.right ? 1 : g.dx <= -LIMIT && cfg.current.left ? -1 : 0;
      if (side) {
        (side > 0 ? cfg.current.right : cfg.current.left)!.onAction();
        haptic.success(); setDoneSide(side);
        Animated.sequence([
          Animated.timing(x, { toValue: side * 46, duration: 120, useNativeDriver: false }),
          Animated.delay(650),
          Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 6 }),
        ]).start(() => { setDir(0); setDoneSide(0); });
      } else Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 8 }).start(() => setDir(0));
    },
    onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: false }).start(() => setDir(0)),
  })).current;

  const act = dir > 0 ? right : dir < 0 ? left : null;
  return (
    <View>
      {act ? (
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center',
          justifyContent: dir > 0 ? 'flex-start' : 'flex-end', paddingHorizontal: 22,
          backgroundColor: dir > 0 ? 'rgba(255,92,122,0.18)' : 'rgba(95,224,255,0.16)' }}>
          <T v="label" c={dir > 0 ? '#FF7A93' : '#7FE6FF'}>{doneSide ? act.done : act.label}</T>
        </View>
      ) : null}
      <Animated.View {...pan.panHandlers} style={[{ transform: [{ translateX: x }] }, dir ? ({ userSelect: 'none' } as object) : null]}>{children}</Animated.View>
    </View>
  );
}

export const swipeColors = { like: '#FF5C7A', save: color.accent };
