// Açılış (~2.1 sn): gözlük zıplayarak gelir, camlar sırayla yeşil dolar, sol camda kitap belirir,
// sağ camda oynat işareti dönerek gelir; sonra logo ekranı kaplayıp solar.
// Ses: sayfa çevirme hışırtısı + kitap kapanma tokluğu, Web Audio ile üretilir. Tarayıcılar kullanıcı
// dokunmadan ses çalmaya izin vermeyebilir (özellikle iPhone); o durumda sessiz geçer.
import { createElement, useEffect, useRef } from 'react';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { color } from '../theme/tokens';
import { LOGO_SVG, LogoMark } from './LogoMark';

const GROW_MS = 650;
const HOLD_MS = 350;
const OUT_MS = 800;

function playOpeningSound() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('AudioContext' in window)) return;
  try {
    const c = new AudioContext();
    const go = () => {
      const t = c.currentTime;
      // Sayfa hışırtısı: bant geçiren filtreden süpürülen gürültü
      const len = c.sampleRate * 0.5;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const n = c.createBufferSource(); n.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
      bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(5200, t + 0.35);
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.06); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      n.connect(bp); bp.connect(g); g.connect(c.destination); n.start(t); n.stop(t + 0.5);
      // Kitap kapanma: alçak, yumuşak "tok"
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(140, t + 0.42); o.frequency.exponentialRampToValueAtTime(55, t + 0.7);
      const og = c.createGain(); og.gain.setValueAtTime(0, t + 0.42); og.gain.linearRampToValueAtTime(0.5, t + 0.45); og.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      o.connect(og); og.connect(c.destination); o.start(t + 0.42); o.stop(t + 0.85);
      setTimeout(() => { void c.close(); }, 1500);
    };
    if (c.state === 'suspended') {
      c.resume().then(() => { if (c.state === 'running') go(); else void c.close(); }).catch(() => void c.close());
    } else go();
  } catch {
    /* ses çalınamadı: sessiz açılış */
  }
}

// Web: logonun parçaları ayrı ayrı canlandırılır (Web Animations API)
function WebSplash({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    playOpeningSound();
    const root = ref.current;
    const svg = root?.querySelector('svg') as SVGSVGElement | null;
    const done = () => onDone();
    const safety = setTimeout(done, 2800); // animasyon kaçarsa yine de kapan
    if (!root || !svg || typeof svg.animate !== 'function') { clearTimeout(safety); done(); return; }
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 600, fill: 'both' }).onfinish = done;
      return () => clearTimeout(safety);
    }
    const part = (sel: string) => { const el = svg.querySelector(sel) as SVGElement | null; if (el) { el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center'; } return el; };
    const spring = 'cubic-bezier(.3,1.5,.5,1)';
    svg.animate([{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 520, easing: spring, fill: 'both' });
    [part('.logo-lens-l'), part('.logo-lens-r')].forEach((el, i) => el?.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: 300, delay: 300 + i * 200, fill: 'both' }));
    part('.logo-book')?.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 400, delay: 650, easing: spring, fill: 'both' });
    part('.logo-play')?.animate([{ opacity: 0, transform: 'rotate(-180deg) scale(.3)' }, { opacity: 1, transform: 'rotate(0deg) scale(1)' }], { duration: 500, delay: 850, easing: spring, fill: 'both' });
    svg.animate([{ transform: 'scale(1)', filter: 'drop-shadow(0 0 24px rgba(0,229,160,.45))' }, { transform: 'scale(1.6)', filter: 'none', offset: 0.15 }, { transform: 'scale(9)', filter: 'none' }], { duration: 650, delay: 1500, easing: 'cubic-bezier(.5,0,.9,.4)', fill: 'forwards', composite: 'replace' });
    root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, delay: 1700, fill: 'both' }).onfinish = () => { clearTimeout(safety); done(); };
    return () => clearTimeout(safety);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return createElement('div', {
    ref, role: 'img', 'aria-label': 'BOOKFLIX açılıyor',
    style: { position: 'absolute', inset: 0, zIndex: 9999, background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
    dangerouslySetInnerHTML: { __html: LOGO_SVG.replace('<svg ', '<svg style="width:min(56vw,280px);height:auto;overflow:visible;filter:drop-shadow(0 0 24px rgba(0,229,160,.45))" ') },
  });
}

export function BrandSplash({ onDone }: { onDone: () => void }) {
  if (Platform.OS === 'web') return <WebSplash onDone={onDone} />;
  return <NativeSplash onDone={onDone} />;
}

function NativeSplash({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const scale = useSharedValue(0.25);
  const opacity = useSharedValue(1);
  const logoW = Math.min(width * 0.5, 260);
  const cover = (Math.hypot(width, height) / logoW) * 1.6; // logo ekranı kaplayacak kadar büyür

  useEffect(() => {
    playOpeningSound();
    scale.value = withSequence(
      withTiming(1, { duration: GROW_MS, easing: Easing.out(Easing.back(1.6)) }),
      withDelay(HOLD_MS, withTiming(cover, { duration: OUT_MS, easing: Easing.in(Easing.cubic) })),
    );
    opacity.value = withDelay(GROW_MS + HOLD_MS + OUT_MS * 0.35, withTiming(0, { duration: OUT_MS * 0.65 }, (fin) => { if (fin) runOnJS(onDone)(); }));
    const safety = setTimeout(onDone, GROW_MS + HOLD_MS + OUT_MS + 400); // animasyon kaçarsa yine de kapan
    return () => clearTimeout(safety);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const wrapStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 9999, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' }, wrapStyle]}
      accessibilityLabel="BOOKFLIX açılıyor">
      <Animated.View style={logoStyle}>
        <LogoMark width={logoW} />
      </Animated.View>
    </Animated.View>
  );
}
