import { BlurView } from 'expo-blur';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { haptic } from '../lib/haptics';
import { color, radius, space } from '../theme/tokens';
import { IconEye } from './icons';
import { T } from './ui';

// Spoiler işaretli içerik varsayılan olarak gizlidir; ekran okuyucu gizli metni okumaz.
export function SpoilerVeil({ text, hidden: initiallyHidden = true }: { text: string; hidden?: boolean }) {
  const [hidden, setHidden] = useState(initiallyHidden);
  if (!hidden) {
    return (
      <Animated.View entering={FadeIn.duration(250)} style={styles.open}>
        <T v="bodySm" c="#D5DED9">{text}</T>
        <Pressable onPress={() => setHidden(true)} accessibilityRole="button" hitSlop={8} style={{ marginTop: space[2] }}>
          <T v="label" c={color.accent}>Gizle</T>
        </Pressable>
      </Animated.View>
    );
  }
  return (
    <View style={styles.wrap}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <T v="bodySm" c="#D5DED9" style={{ padding: space[3] }} numberOfLines={4}>{text}</T>
      </View>
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Spoiler içeriyor. Göstermek için dokun."
        onPress={() => { haptic.select(); setHidden(false); }}
        style={styles.btn}
      >
        <IconEye />
        <T v="label" c={color.accent}>Spoiler içeriyor · Göster</T>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space[3], borderRadius: 12, overflow: 'hidden', minHeight: 64 },
  btn: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
    borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(0,217,192,0.5)', borderRadius: 12, backgroundColor: 'rgba(12,18,16,0.55)' },
  open: { marginTop: space[3], padding: space[3], borderRadius: radius.sm, backgroundColor: 'rgba(0,217,192,0.06)' },
});
