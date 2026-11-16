// Okuma oturumu: zamanlayıcı, sayfa ilerlemesi, odak sesleri, not → alıntı. Bitince seri ve XP gösterilir.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateQuote } from '../../src/api/content';
import { useLibraryEntry, useMedia, useSaveCurrentPage } from '../../src/api/media';
import { Button, Cover, T } from '../../src/components/ui';
import { haptic } from '../../src/lib/haptics';
import { errorMessage, supabase } from '../../src/lib/supabase';
import { getSoundVolume, playSound, setSoundVolume, SILENT, SOUNDS, SOUNDS_SUPPORTED, stopSound, type Rgb, type SoundId } from '../../src/features/session/focusSounds';
import { SceneCanvas } from '../../src/features/session/SceneCanvas';
import { inputStyle } from '../../src/theme/inputs';
import { color, radius, space } from '../../src/theme/tokens';

const ROUND = 25 * 60; // halka 25 dakikalık odak turunu gösterir

function clock(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

type Result = { xp: number; bonus_xp: number; streak: number; best: number; milestone: boolean };

export default function ReadingSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const media = useMedia(id);
  const entry = useLibraryEntry(id);
  const qc = useQueryClient();
  const createQuote = useCreateQuote();

  const [running, setRunning] = useState(true);
  const [, setTick] = useState(0);
  const acc = useRef(0);               // biriken ms (duraklatmalar arası)
  const since = useRef<number | null>(Date.now());
  const [startPage, setStartPage] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [sound, setSound] = useState<SoundId | null>(null);
  const [vol, setVol] = useState(getSoundVolume());
  const [soundsOpen, setSoundsOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [notePage, setNotePage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const savePage = useSaveCurrentPage(id);
  const pageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPage = useRef<number | null>(null);

  // Başlangıç sayfası kütüphanedeki son sayfadan (önbellekteki eski değer değil, sunucudan gelen)
  useEffect(() => {
    if (startPage === null && entry.isSuccess && !entry.isFetching) {
      const p = entry.data?.current_page ?? 0;
      setStartPage(p); setPage(p);
    }
  }, [entry.data, entry.isSuccess, entry.isFetching, startPage]);

  // Sayfa değiştikçe kısa bir beklemeyle kaydet; ekrandan çıkarken bekleyeni hemen yaz
  const flushPage = () => {
    if (pageTimer.current) { clearTimeout(pageTimer.current); pageTimer.current = null; }
    const p = pendingPage.current; pendingPage.current = null;
    if (p !== null && p > 0) savePage(p).catch(() => undefined);
  };
  const changePage = (fn: (p: number) => number) => {
    setPage((prev) => {
      const next = fn(prev);
      if (next !== prev) {
        pendingPage.current = next;
        if (pageTimer.current) clearTimeout(pageTimer.current);
        pageTimer.current = setTimeout(flushPage, 700);
      }
      return next;
    });
  };
  useEffect(() => () => flushPage(), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => { clearInterval(t); stopSound(true); };
  }, []);

  const elapsedMs = acc.current + (running && since.current ? Date.now() - since.current : 0);
  const sec = Math.floor(elapsedMs / 1000);
  const total = media.data?.book_details?.page_count ?? null;
  const authors = useMemo(() => (media.data?.media_contributors ?? []).filter((c) => c.role === 'author').map((c) => c.contributors.name), [media.data]);

  const toggle = () => {
    haptic.select();
    if (running) { acc.current += Date.now() - (since.current ?? Date.now()); since.current = null; setRunning(false); }
    else { since.current = Date.now(); setRunning(true); }
  };

  const pickSound = (s: SoundId | null) => {
    haptic.select();
    setSound(s);
    if (s) playSound(s); else stopSound();
  };

  const saveNote = () => {
    const body = note.trim();
    if (body.length < 2) return;
    const pn = Number(notePage) || page || null;
    createQuote.mutate({ media_id: id, body, page_number: pn }, {
      onSuccess: (res) => {
        setNoteOpen(false); setNote('');
        Alert.alert('Alıntı kaydedildi', res.xp > 0 ? `+${res.xp} XP kazandın. Alıntın profilinde ve akışta görünür.` : 'Alıntın profilinde ve akışta görünür.');
      },
      onError: (e) => Alert.alert('Kaydedilemedi', errorMessage(e)),
    });
  };

  const finish = async () => {
    flushPage();
    if (sec < 10) { stopSound(true); router.back(); return; }
    setBusy(true);
    if (running) { acc.current += Date.now() - (since.current ?? Date.now()); since.current = null; setRunning(false); }
    const { data, error } = await supabase.rpc('finish_reading_session', {
      p_media_id: id, p_seconds: Math.floor(acc.current / 1000), p_start_page: startPage, p_end_page: page || null,
    });
    setBusy(false);
    if (error) { Alert.alert('Kaydedilemedi', errorMessage(error)); return; }
    stopSound();
    haptic.success();
    qc.invalidateQueries({ queryKey: ['library'] });
    qc.invalidateQueries({ queryKey: ['streak'] });
    qc.invalidateQueries({ queryKey: ['profileSummary'] });
    setResult(data as Result);
  };

  const close = () => {
    if (sec >= 60) {
      Alert.alert('Oturum kaydedilmedi', 'Çıkarsan bu okuma süresi kaydedilmez. Kaldığın sayfa yine de saklanır.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Süreyi kaydetmeden çık', style: 'destructive', onPress: () => { flushPage(); stopSound(true); router.back(); } },
      ]);
    } else { flushPage(); stopSound(true); router.back(); }
  };

  const prog = (sec % ROUND) / ROUND;
  const rounds = Math.floor(sec / ROUND);
  const cur = SOUNDS.find((q) => q.id === sound) ?? SILENT;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#060A09' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: space[4], paddingBottom: space[6], alignItems: 'center' }}>
        <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', height: 52 }}>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={10} style={{ width: 44, height: 44, justifyContent: 'center' }}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color.textMuted} strokeWidth={2} strokeLinecap="round"><Path d="M6 6l12 12M18 6L6 18" /></Svg>
          </Pressable>
          <T v="label" c={color.textMuted} style={{ flex: 1, textAlign: 'center', marginRight: 44 }}>Okuma Oturumu</T>
        </View>

        {media.data ? (
          <View style={{ alignItems: 'center', marginTop: space[2] }}>
            <View style={{ shadowColor: color.primary, shadowOpacity: 0.35, shadowRadius: 22 }}>
              <Cover id={media.data.id} path={media.data.cover_path} title={media.data.title} width={86} radius={radius.sm} />
            </View>
            <T v="titleSm" style={{ marginTop: space[3], textAlign: 'center' }} numberOfLines={2}>{media.data.title}</T>
            {authors.length ? <T v="bodySm" c={color.textMuted} style={{ textAlign: 'center' }}>{authors.join(', ')}</T> : null}
          </View>
        ) : null}

        <BigTimer sec={sec} prog={prog} rounds={rounds} running={running} soundId={sound ?? 'off'} label={sound ? cur.label : null} tint={cur.tint} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4], marginTop: space[6] }}>
          <PageBtn label="−" onPress={() => changePage((p) => Math.max(0, p - 1))} a11y="Bir sayfa geri" />
          <View style={{ alignItems: 'center', minWidth: 120 }}>
            <T v="titleSm" style={{ fontVariant: ['tabular-nums'] }}>Sayfa {page}{total ? ` / ${total}` : ''}</T>
            {startPage !== null && page > startPage ? <T v="caption" c={color.primary}>+{page - startPage} sayfa bu oturumda</T> : <T v="caption" c={color.textFaint}>Okudukça ilerlet</T>}
          </View>
          <PageBtn label="+" onPress={() => changePage((p) => (total ? Math.min(total, p + 1) : p + 1))} a11y="Bir sayfa ileri" />
        </View>

        <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={running ? 'Duraklat' : 'Devam et'}
          style={({ pressed }) => ({ width: 84, height: 84, borderRadius: 42, marginTop: space[6], alignItems: 'center', justifyContent: 'center',
            backgroundColor: color.primary, shadowColor: color.primary, shadowOpacity: 0.6, shadowRadius: 26, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
          <Svg width={30} height={30} viewBox="0 0 24 24">
            {running ? <><Rect x={6} y={5} width={4} height={14} rx={1.5} fill={color.onPrimary} /><Rect x={14} y={5} width={4} height={14} rx={1.5} fill={color.onPrimary} /></>
              : <Path d="M8 5.5v13l11-6.5z" fill={color.onPrimary} />}
          </Svg>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: space[3], alignSelf: 'stretch', marginTop: space[6] }}>
          <Pill label={sound ? SOUNDS.find((s) => s.id === sound)!.label : 'Sesler'} active={!!sound} onPress={() => setSoundsOpen(true)}
            icon={<Path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />} />
          <Pill label="Not ekle" onPress={() => { setNotePage(page ? String(page) : ''); setNoteOpen(true); }}
            icon={<Path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />} />
        </View>
        <Button title="Oturumu bitir" kind="secondary" onPress={finish} loading={busy} style={{ alignSelf: 'stretch', marginTop: space[3] }} />
      </ScrollView>

      <Sheet visible={soundsOpen} onClose={() => setSoundsOpen(false)}>
        <Pressable onPress={() => setSoundsOpen(false)} accessibilityRole="button" accessibilityLabel="Tamam" hitSlop={8}
          style={{ position: 'absolute', top: 18, right: 16, zIndex: 2, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: '#1E2A25' }}>
          <T v="label">Tamam</T>
        </Pressable>
        <T style={{ fontFamily: 'Fraunces_400Regular_Italic', fontSize: 38, lineHeight: 46, color: color.text, textAlign: 'center', marginTop: space[4] }}>{cur.label}</T>
        <T v="bodySm" c={color.textMuted} style={{ textAlign: 'center', marginTop: -8 }}>{cur.hint}</T>
        {SOUNDS_SUPPORTED ? (
          <>
            <SoundCards value={sound} onPick={pickSound} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[2] }}>
              <T v="label" c={color.textMuted} style={{ flex: 1 }}>Ses düzeyi %{Math.round(vol * 100)}</T>
              <PageBtn label="−" onPress={() => { const v = Math.max(0, vol - 0.1); setVol(v); setSoundVolume(v); }} a11y="Sesi azalt" />
              <PageBtn label="+" onPress={() => { const v = Math.min(1, vol + 0.1); setVol(v); setSoundVolume(v); }} a11y="Sesi artır" />
            </View>
          </>
        ) : <T v="body" c={color.textMuted}>Odak sesleri şimdilik web sürümünde çalışıyor.</T>}
      </Sheet>

      <Sheet visible={noteOpen} onClose={() => setNoteOpen(false)} title="Not ekle">
        <T v="caption" c={color.textMuted}>Altını çizdiğin cümleyi yaz; alıntı olarak kaydedilir.</T>
        <TextInput value={note} onChangeText={setNote} multiline maxLength={600} autoFocus placeholder="“…”" placeholderTextColor={color.textFaint}
          accessibilityLabel="Alıntı metni" style={[inputStyle, { height: 120, paddingTop: 14, textAlignVertical: 'top' }]} />
        <TextInput value={notePage} onChangeText={(t) => setNotePage(t.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" placeholder="Sayfa"
          placeholderTextColor={color.textFaint} accessibilityLabel="Sayfa numarası" style={inputStyle} />
        <Button title="Alıntı olarak kaydet" onPress={saveNote} disabled={note.trim().length < 2} loading={createQuote.isPending} />
      </Sheet>

      <Modal visible={!!result} transparent animationType="fade" onRequestClose={() => router.back()}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: space[4] }}>
          {result ? (
            <View style={{ backgroundColor: color.surface, borderRadius: radius.lg, padding: space[6], alignItems: 'center', gap: space[2], borderWidth: 1, borderColor: 'rgba(0,229,160,0.4)' }}>
              <Svg width={64} height={64} viewBox="0 0 24 24"><Path d="M12 2c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z" fill="#FF9F43" /><Path d="M12 12c.6 1.8 2.5 2.4 2.5 4.3a2.5 2.5 0 0 1-5 0c0-1.2.7-2 1.3-2.6.2 1 .7 1.4 1.2 1.4 0-1.2-.3-2 0-3.1z" fill="#FFE08A" /></Svg>
              <T style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 40, lineHeight: 46, color: color.text }}>{result.streak} gün</T>
              <T v="label" c={color.textMuted}>{result.milestone ? 'Yeni seri rekoru! Kilometre taşına ulaştın.' : 'okuma serin sürüyor'}</T>
              <T v="titleSm" style={{ marginTop: space[3] }}>{clock(Math.floor(acc.current / 1000))} okudun{startPage !== null && page > startPage ? ` · ${page - startPage} sayfa` : ''}</T>
              {result.xp + result.bonus_xp > 0 ? (
                <T v="label" c={color.primary}>+{result.xp + result.bonus_xp} XP{result.bonus_xp ? ` (seri ödülü +${result.bonus_xp})` : ''}</T>
              ) : <T v="caption" c={color.textMuted}>10 dakika ve üstü oturumlar XP kazandırır.</T>}
              <Button title="Tamam" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: space[4] }} />
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PageBtn({ label, onPress, a11y }: { label: string; onPress: () => void; a11y: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={6}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface,
        borderWidth: 1, borderColor: '#1F2B26', transform: [{ scale: pressed ? 0.92 : 1 }] })}>
      <T style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 22, lineHeight: 26, color: color.text }}>{label}</T>
    </Pressable>
  );
}

function Pill({ label, onPress, icon, active }: { label: string; onPress: () => void; icon: React.ReactNode; active?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: active ? 'rgba(0,229,160,0.12)' : color.surface, borderWidth: 1, borderColor: active ? color.primary : '#1F2B26',
        transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={active ? color.primary : color.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{icon}</Svg>
      <T v="label" c={active ? color.primary : color.text}>{label}</T>
    </Pressable>
  );
}

function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} accessibilityLabel="Kapat" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: color.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: space[4], paddingBottom: space[8], gap: space[3] }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A3A33' }} />
          {title ? <T v="titleSm">{title}</T> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const rgb = (c: Rgb, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// Büyük sayaç: ince neon halka, ortada eğik dev rakamlar, arkada seçilen sesin sahnesi.
function BigTimer({ sec, prog, rounds, running, soundId, label, tint }: {
  sec: number; prog: number; rounds: number; running: boolean; soundId: SoundId | 'off'; label: string | null; tint: Rgb;
}) {
  const { width: winW } = useWindowDimensions();
  const size = Math.min(320, winW - 40);
  const R = size * 0.44, c = size / 2, circ = 2 * Math.PI * R;
  const a1 = prog * 2 * Math.PI - Math.PI / 2;
  const inner = Math.round((R - 8) * 2);
  const blink = useSharedValue(1);
  useEffect(() => {
    if (running) { cancelAnimation(blink); blink.value = withTiming(1, { duration: 200 }); }
    else blink.value = withRepeat(withTiming(0.45, { duration: 750 }), -1, true);
  }, [running, blink]);
  const digits = useAnimatedStyle(() => ({ opacity: blink.value }));
  return (
    <View style={{ width: size, height: size, marginTop: space[4], alignItems: 'center', justifyContent: 'center' }}
      accessible accessibilityLabel={`${Math.floor(sec / 60)} dakika ${sec % 60} saniye okuma${running ? '' : ', duraklatıldı'}`}>
      <View style={{ position: 'absolute', left: c - inner / 2, top: c - inner / 2 }}>
        <SceneCanvas id={soundId} tint={tint} width={inner} height={inner} running={running} scale={3} opacity={running ? 0.38 : 0.15} round />
      </View>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id="tdim" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#060A09" stopOpacity={0.8} />
            <Stop offset="1" stopColor="#060A09" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={R} fill="url(#tdim)" />
        <Circle cx={c} cy={c} r={R} stroke="#1C2621" strokeWidth={3} fill="none" />
        <Circle cx={c} cy={c} r={R} stroke={rgb(tint, 0.18)} strokeWidth={14} fill="none" strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - prog)} transform={`rotate(-90 ${c} ${c})`} />
        <Circle cx={c} cy={c} r={R} stroke={rgb(tint)} strokeWidth={5} fill="none" strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - prog)} transform={`rotate(-90 ${c} ${c})`} />
        <Circle cx={c + R * Math.cos(a1)} cy={c + R * Math.sin(a1)} r={11} fill={rgb(tint, 0.25)} />
        <Circle cx={c + R * Math.cos(a1)} cy={c + R * Math.sin(a1)} r={7} fill="#F4F8F5" />
      </Svg>
      <Animated.View style={[{ alignItems: 'center' }, digits]}>
        <T style={{ fontFamily: 'Fraunces_400Regular_Italic', fontSize: Math.round(size * (sec >= 3600 ? 0.2 : 0.27)), lineHeight: Math.round(size * 0.32),
          color: color.text, fontVariant: ['tabular-nums'], textShadowColor: running ? rgb(tint, 0.6) : 'transparent', textShadowRadius: 24 }}>{clock(sec)}</T>
      </Animated.View>
      <T v="caption" c={running ? color.textMuted : color.textSoft}>{running ? (label ? `${label.toLocaleLowerCase('tr-TR')} · okuyorsun` : 'okuyorsun') : 'duraklatıldı'}</T>
      {rounds ? <T v="caption" c={rgb(tint)} style={{ marginTop: 4 }}>{rounds} odak turu tamam</T> : null}
    </View>
  );
}

// Canlı ses kartları: her ses kendi küçük sahnesiyle; seçilen kart parlar.
function SoundCards({ value, onPick }: { value: SoundId | null; onPick: (s: SoundId | null) => void }) {
  const items = [{ id: null, label: SILENT.label, tint: SILENT.tint }, ...SOUNDS];
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space[2] }}>
      {items.map((s) => {
        const on = value === s.id;
        return (
          <Pressable key={s.id ?? 'off'} onPress={() => onPick(s.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={s.label}
            style={({ pressed }) => ({ flexBasis: '31%', flexGrow: 1, alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 10, borderRadius: radius.md,
              backgroundColor: '#0F1714', borderWidth: on ? 2 : 1, borderColor: on ? color.primary : color.borderStrong,
              shadowColor: color.primary, shadowOpacity: on ? 0.35 : 0, shadowRadius: 16, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
            <SceneCanvas id={s.id ?? 'off'} tint={s.tint} width={72} height={52} scale={0.8} opacity={on ? 1 : 0.55} />
            <T v="label" c={on ? color.text : color.textSoft}>{s.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
