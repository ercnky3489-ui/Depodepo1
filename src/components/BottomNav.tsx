import type { BottomTabBarProps } from 'expo-router/tabs';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnreadCount } from '../api/social';
import { haptic } from '../lib/haptics';
import { color, glow, space } from '../theme/tokens';
import { IconBell, IconCompass, IconHome, IconPlus, IconUser } from './icons';
import { T } from './ui';
import { MiniSession } from '../features/session/MiniSession';

const TABS = [
  { name: 'index', label: 'Ana Sayfa', Icon: IconHome },
  { name: 'discover', label: 'Keşfet', Icon: IconCompass },
  { name: 'share', label: 'Paylaş', Icon: null },
  { name: 'notifications', label: 'Bildirimler', Icon: IconBell },
  { name: 'profile', label: 'Profil', Icon: IconUser },
] as const;

export function BottomNav({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const unread = useUnreadCount().data ?? 0;
  const active = state.routes[state.index]?.name;
  return (
    <View style={{ backgroundColor: color.bgTranslucent }}>
    <MiniSession />
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.border,
      paddingTop: space[2], paddingBottom: Math.max(insets.bottom, space[3]) }}>
      {TABS.map((tab) => {
        if (tab.name === 'share') {
          return (
            <View key="share" style={{ flex: 1, alignItems: 'center' }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Paylaş" onPress={() => { haptic.select(); router.push('/compose'); }}
                style={({ pressed }) => [{ width: 56, height: 56, marginTop: -22, borderRadius: 18, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center',
                  borderWidth: 5, borderColor: color.bg }, glow.strong, pressed && { transform: [{ scale: 0.94 }] }]}>
                <IconPlus />
              </Pressable>
            </View>
          );
        }
        const on = active === tab.name;
        const Icon = tab.Icon!;
        return (
          <Pressable key={tab.name} accessibilityRole="tab" accessibilityState={{ selected: on }}
            accessibilityLabel={tab.name === 'notifications' && unread ? `${tab.label}, ${unread} okunmamış` : tab.label}
            onPress={() => {
              haptic.select();
              const route = state.routes.find((r) => r.name === tab.name);
              if (!route) return;
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!on && !event.defaultPrevented) navigateToTab(route.key);
            }}
            style={{ flex: 1, alignItems: 'center', gap: 4, minHeight: 44 }}>
            <Icon c={on ? color.primary : color.textMuted} fill={on ? 'rgba(0,229,160,0.15)' : 'none'} />
            <T v="navLabel" c={on ? color.primary : color.textMuted}>{tab.label}</T>
            {tab.name === 'notifications' && unread > 0 ? (
              <View style={{ position: 'absolute', top: -2, left: '55%', minWidth: 16, height: 16, borderRadius: 8, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                <T v="navLabel" c={color.onPrimary} style={{ fontFamily: 'Inter_700Bold' }}>{unread > 9 ? '9+' : unread}</T>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
    </View>
  );
}
