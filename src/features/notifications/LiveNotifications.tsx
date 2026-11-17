// Canlı bildirim: uygulama açıkken yeni bildirim (beğeni, takip, faydalı oy…) gelince üstte kısa bir kart
// gösterir ve kitap sesi çalar. Aynı anda gelenler tek kartta toplanır ("Ayşe K. ve 4 kişi daha").
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Avatar, T } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { haptic } from '../../lib/haptics';
import { playNotifySound, primeNotifySound } from '../../lib/notifySound';
import { supabase } from '../../lib/supabase';
import { color, radius, space } from '../../theme/tokens';
import type { NotificationRow } from '../../types/db';
import { notificationTarget, notificationText } from './text';

type Actor = { id: string; username: string | null; display_name: string | null; avatar_path: string | null };
type Toast = { key: number; first: NotificationRow & { actor: Actor | null }; more: number };

export function LiveNotifications() {
  const { profile } = useAuth();
  const uid = profile?.id ?? null;
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const batch = useRef<(NotificationRow & { actor_id: string | null })[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { primeNotifySound(); }, []);

  useEffect(() => {
    if (!uid) return;
    const flush = async () => {
      const rows = batch.current; batch.current = [];
      if (!rows.length) return;
      const first = rows[rows.length - 1]!;
      let actor: Actor | null = null;
      if (first.actor_id) {
        const { data } = await supabase.from('profiles').select('id, username, display_name, avatar_path').eq('id', first.actor_id).maybeSingle();
        actor = (data as Actor | null) ?? null;
      }
      qc.invalidateQueries({ queryKey: ['notifications'] });
      const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
      if (visible) { playNotifySound(); haptic.select(); }
      setToast({ key: Date.now(), first: { ...first, actor }, more: rows.length - 1 });
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setToast(null), 4500);
    };
    const ch = supabase.channel(`notif:${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${uid}` }, (p) => {
        batch.current.push(p.new as NotificationRow & { actor_id: string | null });
        if (flushTimer.current) clearTimeout(flushTimer.current);
        flushTimer.current = setTimeout(flush, 1200);
      })
      .subscribe();
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      void supabase.removeChannel(ch);
    };
  }, [uid, qc]);

  if (!toast) return null;
  const n = toast.first, a = n.actor;
  const name = a?.display_name ?? a?.username ?? 'Biri';
  const go = notificationTarget(n);
  const isLike = n.type === 'like' || n.type === 'helpful';
  return (
    <Animated.View key={toast.key} entering={SlideInUp.springify().damping(16)} exiting={SlideOutUp.duration(250)}
      style={{ position: 'absolute', top: insets.top + 8, left: space[3], right: space[3], zIndex: 9000 }} accessibilityLiveRegion="polite">
      <Pressable onPress={() => { setToast(null); router.push((go ?? '/(tabs)/notifications') as never); }} accessibilityRole="button"
        accessibilityLabel={`${name}${toast.more ? ` ve ${toast.more} kişi daha` : ''} ${notificationText(n)}. Aç`}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: 12, borderRadius: radius.lg,
          backgroundColor: 'rgba(17,25,22,0.97)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.45)',
          shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        <View>
          <Avatar name={name} path={a?.avatar_path ?? null} size={40} />
          <View style={{ position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: isLike ? '#FF5C7A' : color.primary,
            alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#111916' }}>
            <Svg width={11} height={11} viewBox="0 0 24 24">
              {isLike ? <Path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3 1.6-1.8 3-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" fill="#fff" />
                : <Path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" fill="#080B0A" />}
            </Svg>
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="label" numberOfLines={1}>{name}{toast.more ? <T v="label" c={color.textMuted}> ve {toast.more} kişi daha</T> : null}</T>
          <T v="bodySm" c={color.textSoft} numberOfLines={2}>{notificationText(n)}</T>
        </View>
      </Pressable>
    </Animated.View>
  );
}
