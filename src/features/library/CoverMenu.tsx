// Kapağa basılı tutunca açılan hızlı menü: durum değiştir (Okudum / Okuyorum / Okuyacağım), alıntı ekle, paylaş.
// Herhangi bir yerden openCoverMenu(media) çağrılır; CoverMenuHost kökte bir kez çizilir.
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, Share, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { celebrate } from '../../components/Confetti';
import { Cover, T } from '../../components/ui';
import { useUserId } from '../../lib/auth';
import { haptic } from '../../lib/haptics';
import { supabase } from '../../lib/supabase';
import { color, radius, space } from '../../theme/tokens';
import type { LibraryStatus, MediaKind } from '../../types/db';

export type CoverMenuMedia = { id: string; title: string; cover_path: string | null; kind?: MediaKind };
let open: ((m: CoverMenuMedia) => void) | null = null;
export function openCoverMenu(m: CoverMenuMedia) { haptic.status(); open?.(m); }

const LABELS: Record<MediaKind, Record<'planned' | 'in_progress' | 'completed', string>> = {
  book: { planned: 'Okuyacağım', in_progress: 'Okuyorum', completed: 'Okudum' },
  movie: { planned: 'İzleyeceğim', in_progress: 'İzliyorum', completed: 'İzledim' },
  series: { planned: 'İzleyeceğim', in_progress: 'İzliyorum', completed: 'İzledim' },
};
const ICON = { completed: '✓', in_progress: '📖', planned: '🔖' } as const;

export function CoverMenuHost() {
  const uid = useUserId();
  const qc = useQueryClient();
  const [m, setM] = useState<CoverMenuMedia | null>(null);
  const [status, setStatus] = useState<LibraryStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { open = (x) => setM(x); return () => { open = null; }; }, []);
  useEffect(() => {
    if (!m || !uid) return;
    setStatus(null);
    supabase.from('library_entries').select('status').eq('user_id', uid).eq('media_id', m.id).maybeSingle()
      .then(({ data }) => setStatus((data?.status as LibraryStatus | undefined) ?? null));
  }, [m, uid]);

  if (!m) return null;
  const kind = m.kind ?? 'book';
  const close = () => setM(null);
  const refresh = () => {
    ['shelves', 'library', 'me', 'feed', 'profileSummary', 'streak', 'media'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
  const pick = async (s: 'planned' | 'in_progress' | 'completed') => {
    if (!uid || busy) return;
    setBusy(true);
    const { error } = status === s
      ? await supabase.from('library_entries').delete().eq('user_id', uid).eq('media_id', m.id) // seçili olana tekrar dokunmak kaldırır
      : await supabase.from('library_entries').upsert({ user_id: uid, media_id: m.id, status: s }, { onConflict: 'user_id,media_id' });
    setBusy(false);
    if (error) { haptic.error(); return; }
    haptic.success();
    if (s === 'completed' && status !== 'completed') celebrate();
    refresh(); close();
  };
  const share = async () => {
    const url = `https://ercnky3489-ui.github.io/Depodepo1/media/${m.id}`;
    close();
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) await navigator.share({ title: m.title, url });
      else await Share.share({ message: `${m.title} · BOOKFLIX ${url}` });
    } catch { /* vazgeçildi */ }
  };
  const row = (label: string, icon: string, onPress: () => void, on = false, last = false) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: 13, paddingHorizontal: space[4],
        borderBottomWidth: last ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.07)', backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : 'transparent' })}>
      <T style={{ width: 22, textAlign: 'center' }}>{icon}</T>
      <T v="label" c={on ? color.primary : color.text} style={{ flex: 1 }}>{label}</T>
      {on ? <T v="caption" c={color.primary}>seçili · kaldır</T> : null}
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <Pressable onPress={close} accessibilityLabel="Kapat"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4], padding: space[6], backgroundColor: 'rgba(0,0,0,0.45)',
          ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' } as object) : {}) }}>
        <Animated.View entering={ZoomIn.springify().damping(15)}>
          <Cover id={m.id} path={m.cover_path} title={m.title} width={128} radius={radius.sm} shadow />
        </Animated.View>
        <Animated.View entering={FadeIn.duration(180)} style={{ width: '100%', maxWidth: 300, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: 'rgba(28,38,34,0.96)' }}>
          <Pressable onPress={() => {}}>
            <T v="label" numberOfLines={1} style={{ paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[2] }}>{m.title}</T>
            {(['completed', 'in_progress', 'planned'] as const).map((s) => <View key={s}>{row(LABELS[kind][s], ICON[s], () => pick(s), status === s)}</View>)}
            {kind === 'book' ? row('Alıntı ekle', '❝', () => { close(); router.push({ pathname: '/compose/quote', params: { mediaId: m.id } }); }) : null}
            {row('Kitabı aç', '↗', () => { close(); router.push(`/media/${m.id}`); })}
            {row('Paylaş', '⇪', share, false, true)}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
