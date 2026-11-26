// Mıknatıslı yatay raf: kaydırma bırakılınca her seferinde bir kapağın başına oturur.
// Mağaza uygulamasında snapToInterval, web'de tarayıcının scroll-snap özelliği kullanılır.
import { useEffect, useRef, type ReactNode } from 'react';
import { Platform, ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { haptic } from '../lib/haptics';

type Props = { children: ReactNode; itemWidth: number; gap: number; padding: number; contentStyle?: StyleProp<ViewStyle>; deps?: unknown };

export function SnapRow({ children, itemWidth, gap, padding, contentStyle, deps }: Props) {
  const ref = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const last = useRef(0);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = (ref.current as unknown as { getScrollableNode?: () => HTMLElement })?.getScrollableNode?.();
    if (!node) return;
    node.style.scrollSnapType = 'x mandatory';
    node.style.scrollPaddingInline = `${padding}px`;
    const inner = node.firstElementChild as HTMLElement | null;
    inner?.childNodes.forEach((c) => { const el = c as HTMLElement; if (el.style) el.style.scrollSnapAlign = 'start'; });
  }, [padding, deps]);
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={itemWidth + gap} snapToAlignment="start"
      scrollEventThrottle={64}
      onScroll={(e) => { const i = Math.round(e.nativeEvent.contentOffset.x / (itemWidth + gap)); if (i !== last.current) { last.current = i; haptic.select(); } }}
      contentContainerStyle={[{ gap, paddingHorizontal: padding }, contentStyle]}>
      {children}
    </ScrollView>
  );
}
