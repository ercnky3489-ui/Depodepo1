// Temel arayüz parçaları: metin, buton, avatar, kapak, çip, bölüm başlığı, boş durum.
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { haptic } from '../lib/haptics';
import { imageUrl, placeholderColor } from '../lib/images';
import { initials } from '../lib/format';
import { color, glow, radius, space, type, isDark } from '../theme/tokens';

type Variant = keyof typeof type;

export function T({ v = 'body', c = color.text, style, ...rest }: TextProps & { v?: Variant; c?: string; style?: StyleProp<TextStyle> }) {
  return <Text {...rest} style={[type[v] as TextStyle, { color: c }, style]} />;
}

type ButtonKind = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger';

export function Button({ title, onPress, kind = 'primary', loading, disabled, icon, style, accessibilityLabel }: {
  title: string; onPress?: () => void; kind?: ButtonKind; loading?: boolean; disabled?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const k = buttonKinds[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, k.box, kind === 'primary' && glow.soft, (disabled || loading) && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.96 }] }, style]}
    >
      {loading ? <ActivityIndicator color={k.text} /> : icon}
      <Text style={[type.label as TextStyle, { color: k.text, fontFamily: 'Inter_700Bold' }]}>{title}</Text>
    </Pressable>
  );
}

const buttonKinds: Record<ButtonKind, { box: ViewStyle; text: string }> = {
  primary: { box: { backgroundColor: color.primary }, text: color.onPrimary },
  secondary: { box: { borderWidth: 1, borderColor: color.borderStrong }, text: color.text },
  tonal: { box: { backgroundColor: 'rgba(0,229,160,0.08)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.45)' }, text: color.primary },
  ghost: { box: {}, text: color.textMuted },
  danger: { box: { borderWidth: 1, borderColor: 'rgba(255,122,122,0.5)' }, text: color.danger },
};

export function Avatar({ name, path, size = 34, ring }: { name?: string | null; path?: string | null; size?: number; ring?: boolean }) {
  const uri = imageUrl(path);
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: isDark ? '#23352D' : color.surfaceHover, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
      ring && { borderWidth: 2, borderColor: color.primary }]}>
      {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityIgnoresInvertColors />
        : <Text style={{ color: color.text, fontFamily: 'Inter_700Bold', fontSize: size * 0.36 }}>{initials(name)}</Text>}
    </View>
  );
}

export function Cover({ id, path, title, width, ratio = 1.5, radius: r = radius.xs, shadow }: {
  id: string; path: string | null | undefined; title?: string; width: number; ratio?: number; radius?: number; shadow?: boolean;
}) {
  const uri = imageUrl(path);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={title ? `${title} kapağı` : 'Kapak'}
      style={[{ width, height: width * ratio, borderRadius: r, backgroundColor: placeholderColor(id), overflow: 'hidden' },
        shadow && { shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 14 }, elevation: 8 }]}
    >
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        : title && width >= 80 ? <Text numberOfLines={4} style={{ margin: 10, color: '#EEF4F1', fontFamily: 'Fraunces_700Bold', fontSize: width / 7 }}>{title}</Text> : null}
    </View>
  );
}

export function ChipRow<T extends string>({ items, value, onChange, counts }: {
  items: readonly { id: T; label: string }[]; value: T; onChange: (v: T) => void; counts?: Partial<Record<T, number>>;
}) {
  return (
    // flexGrow 0: web'de yatay ScrollView sütundaki boş alanı doldurup altındaki listeyi aşağı itmesin
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space[2], paddingHorizontal: space[4], paddingVertical: space[2] }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <Pressable
            key={it.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            hitSlop={4}
            onPress={() => { haptic.select(); onChange(it.id); }}
            style={[styles.chip, on ? { backgroundColor: color.primary, borderColor: color.primary, ...glow.soft } : null]}
          >
            <Text style={[type.label as TextStyle, { color: on ? color.onPrimary : color.textSoft }]}>
              {it.label}{counts?.[it.id] !== undefined ? `  ${counts[it.id]}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SectionHeader({ title, subtitle, action, onAction }: { title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: space[4] }}>
      <View style={{ flex: 1 }}>
        <T v="titleMd">{title}</T>
        {subtitle ? <T v="caption" c={color.textMuted} style={{ marginTop: 3 }}>{subtitle}</T> : null}
      </View>
      {action ? <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button"><T v="label" c={color.primary}>{action}</T></Pressable> : null}
    </View>
  );
}

export function Overline({ children, c = color.textMuted }: { children: string; c?: string }) {
  return <T v="overline" c={c}>{children.toLocaleUpperCase('tr-TR')}</T>;
}

export function EmptyState({ title, body, action, onAction }: { title: string; body?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ padding: space[8], alignItems: 'center', gap: space[2] }}>
      <T v="titleSm" style={{ textAlign: 'center' }}>{title}</T>
      {body ? <T v="bodySm" c={color.textMuted} style={{ textAlign: 'center' }}>{body}</T> : null}
      {action ? <Button title={action} onPress={onAction} style={{ marginTop: space[3] }} /> : null}
    </View>
  );
}

export function Card({ children, style, highlight }: { children: ReactNode; style?: StyleProp<ViewStyle>; highlight?: boolean }) {
  return <View style={[styles.card, highlight && { borderColor: 'rgba(0,229,160,0.32)' }, style]}>{children}</View>;
}

export function Loading() {
  return <View style={{ padding: space[8] }}><ActivityIndicator color={color.primary} /></View>;
}

const styles = StyleSheet.create({
  btn: { minHeight: 44, paddingHorizontal: 18, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, justifyContent: 'center' },
  card: { backgroundColor: color.surface, borderColor: color.border, borderWidth: 1, borderRadius: radius.lg, padding: space[4] },
});
