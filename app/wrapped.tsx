// Kişisel yıl özeti (Wrapped): hikâye gibi kaydırılan sayfalar, sonunda paylaşılabilir görsel.
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWrapped, type Wrapped } from '../src/api/profileDetails';
import { Flame } from '../src/components/Streak';
import { Button, Cover, Loading, T } from '../src/components/ui';
import { useAuth } from '../src/lib/auth';
import { MONTHS_TR, renderWrappedStory } from '../src/features/share/wrappedImage';
import { color, radius, space } from '../src/theme/tokens';

const YEAR = new Date().getFullYear();
const AUTO_MS = 6000;
const TONES: [string, string][] = [
  ['#04110C', '#0E3B3A'], ['#071A1C', '#0B3D2E'], ['#0B1020', '#123A4A'], ['#1A1006', '#3A2410'],
  ['#120B1E', '#2E1A40'], ['#06140F', '#16402E'], ['#04110C', '#0E3B3A'],
];

function Big({ children, c = color.text }: { children: React.ReactNode; c?: string }) {
  return <T style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 76, lineHeight: 84, color: c, textAlign: 'center', textShadowColor: 'rgba(0,229,160,0.5)', textShadowRadius: 24 }}>{children}</T>;
}
function Lead({ children }: { children: React.ReactNode }) {
  return <T v="titleLg" style={{ textAlign: 'center' }}>{children}</T>;
}
function Sub({ children }: { children: React.ReactNode }) {
  return <T v="body" c={color.textSoft} style={{ textAlign: 'center', marginTop: space[3] }}>{children}</T>;
}

function slides(w: Wrapped, name: string): { key: string; body: React.ReactNode }[] {
  const hours = Math.round(w.minutes / 60);
  const list: { key: string; body: React.ReactNode }[] = [
    { key: 'intro', body: (
      <>
        <T v="overline" c={color.primary} style={{ textAlign: 'center', letterSpacing: 4 }}>BOOKFLIX</T>
        <Big c={color.primary}>{w.year}</Big>
        <Lead>{name}, yılına birlikte bakalım.</Lead>
      </>
    ) },
    { key: 'books', body: (
      <>
        <Lead>Bu yıl</Lead>
        <Big c={color.primary}>{w.books}</Big>
        <Lead>kitap bitirdin</Lead>
        <Sub>{w.pages.toLocaleString('tr-TR')} sayfa çevirdin.</Sub>
        {w.covers.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: space[6], maxWidth: 330 }}>
            {w.covers.slice(0, 8).map((c, i) => (
              <Animated.View key={c.id} entering={ZoomIn.delay(150 + i * 90).duration(380)}>
                <Cover id={c.id} path={c.cover_path} title={c.title} width={70} radius={radius.xs} />
              </Animated.View>
            ))}
          </View>
        ) : null}
      </>
    ) },
    { key: 'time', body: (
      <>
        <Lead>Okumaya ayırdığın zaman</Lead>
        <Big c="#5FE0FF">{w.minutes >= 120 ? `${hours} saat` : `${w.minutes} dk`}</Big>
        <Sub>{w.sessions} okuma oturumu · {w.reading_days} farklı gün</Sub>
      </>
    ) },
    { key: 'streak', body: (
      <>
        <Flame size={96} lit={w.best_streak > 0} />
        <Big c="#FFB86B">{w.best_streak} gün</Big>
        <Lead>en uzun okuma serin</Lead>
        <Sub>{w.best_streak >= 7 ? 'Bir haftayı aşkın her gün okudun. Bu bir alışkanlık artık.' : 'Gelecek yıl bu seriyi büyütelim.'}</Sub>
      </>
    ) },
  ];
  if (w.top_author || w.top_month) list.push({ key: 'taste', body: (
    <>
      {w.top_author ? (<><Lead>En çok okuduğun yazar</Lead><Big c="#C9A6FF">{w.top_author.name}</Big><Sub>{w.top_author.books} kitabı</Sub></>) : null}
      {w.top_month ? <Sub>{`En verimli ayın: ${MONTHS_TR[w.top_month - 1]}`}</Sub> : null}
    </>
  ) });
  if (w.top_rated) list.push({ key: 'fav', body: (
    <>
      <Lead>Yılın favorin</Lead>
      <Animated.View entering={ZoomIn.duration(500)} style={{ marginVertical: space[6], shadowColor: color.primary, shadowOpacity: 0.5, shadowRadius: 30 }}>
        <Cover id={w.top_rated.id} path={w.top_rated.cover_path} title={w.top_rated.title} width={150} radius={radius.sm} />
      </Animated.View>
      <T v="titleLg" style={{ textAlign: 'center' }}>{w.top_rated.title}</T>
      <Sub>Verdiğin puan: {w.top_rated.rating}/10</Sub>
    </>
  ) });
  list.push({ key: 'voice', body: (
    <>
      <Lead>Sesin de vardı</Lead>
      <Big c={color.primary}>{w.quotes}</Big>
      <Lead>alıntı</Lead>
      <Sub>{w.reviews} inceleme yazdın ve {w.xp.toLocaleString('tr-TR')} XP kazandın.</Sub>
    </>
  ) });
  return list;
}

export default function WrappedScreen() {
  const { profile } = useAuth();
  const q = useWrapped(YEAR);
  const name = profile?.display_name ?? profile?.username ?? 'Okur';
  const pages = useMemo(() => (q.data ? slides(q.data, name) : []), [q.data, name]);
  const total = pages.length + 1; // son sayfa: paylaş
  const [i, setI] = useState(0);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!q.data || i >= total - 1) return;
    const t = setTimeout(() => setI((n) => Math.min(total - 1, n + 1)), AUTO_MS);
    return () => clearTimeout(t);
  }, [i, total, q.data]);

  // Son sayfaya gelince paylaşım görselini hazırla (iOS paylaşımı dokunuşun hemen ardından ister)
  useEffect(() => {
    if (Platform.OS !== 'web' || !q.data || i !== total - 1 || file) return;
    renderWrappedStory(q.data, name).then((blob) => {
      urlRef.current = URL.createObjectURL(blob); setShareUrl(urlRef.current);
      setFile(new File([blob], `bookflix-${YEAR}-ozet.png`, { type: 'image/png' }));
    }).catch(() => undefined);
  }, [i, total, q.data, file, name]);
  // Geçici görsel adresini yalnızca ekran kapanınca bırak
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  if (q.isLoading || !q.data) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><Loading /></SafeAreaView>;
  }
  const tone = TONES[i % TONES.length]!;
  const canShare = !!file && typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [file] });

  return (
    <LinearGradient colors={tone} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: space[3], paddingTop: space[2] }}>
          {Array.from({ length: total }).map((_, k) => (
            <View key={k} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: k <= i ? color.primary : 'rgba(255,255,255,0.18)' }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space[2] }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={10} style={{ padding: 10 }}>
            <T v="label" c={color.textMuted}>Kapat</T>
          </Pressable>
        </View>

        <View style={{ flex: 1 }}>
          <Animated.View key={i} entering={FadeInDown.duration(450)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[6] }}>
            {i < pages.length ? pages[i]!.body : (
              <>
                <Lead>{YEAR} özetin hazır</Lead>
                <Sub>Hikâyende paylaş, arkadaşların da yılına baksın.</Sub>
                {shareUrl ? (
                  <Animated.Image entering={FadeInUp.duration(400)} source={{ uri: shareUrl }} style={{ width: 180, height: 320, borderRadius: radius.md, marginTop: space[6] }} />
                ) : null}
              </>
            )}
          </Animated.View>
          {/* Dokunma alanları: sol geri, sağ ileri */}
          {i < total - 1 ? (
            <View style={{ position: 'absolute', inset: 0, flexDirection: 'row' } as never}>
              <Pressable style={{ flex: 1 }} onPress={() => setI((n) => Math.max(0, n - 1))} accessibilityRole="button" accessibilityLabel="Önceki" />
              <Pressable style={{ flex: 2 }} onPress={() => setI((n) => Math.min(total - 1, n + 1))} accessibilityRole="button" accessibilityLabel="Sonraki" />
            </View>
          ) : null}
        </View>

        {i === total - 1 ? (
          <View style={{ padding: space[4], gap: space[2] }}>
            {canShare ? <Button title="Hikâyede paylaş" onPress={() => { navigator.share({ files: [file!], title: `BOOKFLIX ${YEAR}` }).catch(() => undefined); }} /> : null}
            {shareUrl ? (
              <Button title="Görseli kaydet" kind={canShare ? 'secondary' : 'primary'} onPress={() => {
                const a = document.createElement('a'); a.href = shareUrl; a.download = `bookflix-${YEAR}-ozet.png`; document.body.appendChild(a); a.click(); a.remove();
              }} />
            ) : null}
            <Button title="Baştan izle" kind="ghost" onPress={() => setI(0)} />
          </View>
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
}
