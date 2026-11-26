// Kutlama: kitap bitince, rozet kazanınca ya da seri rekorunda ekranda kısa bir konfeti yağmuru.
// Herhangi bir yerden celebrate() çağrılır; ConfettiHost kökte bir kez çizilir. Yalnızca web'de çizer.
import { createElement, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { haptic } from '../lib/haptics';

type Burst = { big?: boolean };
const subs = new Set<(b: Burst) => void>();
export function celebrate(b: Burst = {}) { subs.forEach((f) => f(b)); }

const COLORS = ['#00E5A0', '#5FE0FF', '#FFB86B', '#FF5C7A', '#F3D27A', '#FFFFFF'];

export function ConfettiHost() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let raf = 0;
    const fire = ({ big }: Burst) => {
      const cv = ref.current; if (!cv) return;
      if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      haptic.success();
      const W = window.innerWidth, H = window.innerHeight, d = window.devicePixelRatio || 1;
      cv.width = W * d; cv.height = H * d;
      const x = cv.getContext('2d'); if (!x) return;
      x.setTransform(d, 0, 0, d, 0, 0);
      const n = big ? 220 : 140;
      const parts = Array.from({ length: n }, (_, i) => {
        const fromLeft = i % 2 === 0;
        return { x: fromLeft ? -10 : W + 10, y: H * 0.65, vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 9), vy: -(8 + Math.random() * 11),
          s: 4 + Math.random() * 5, c: COLORS[i % COLORS.length]!, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.35, w: Math.random() * 6 };
      });
      let frame = 0;
      cancelAnimationFrame(raf);
      const tick = () => {
        x.clearRect(0, 0, W, H);
        for (const p of parts) {
          p.vy += 0.28; p.vx *= 0.985; p.x += p.vx + Math.sin((frame + p.w * 10) / 9); p.y += p.vy; p.a += p.va;
          x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore();
        }
        if (++frame < 170) raf = requestAnimationFrame(tick); else x.clearRect(0, 0, W, H);
      };
      tick();
    };
    subs.add(fire);
    return () => { subs.delete(fire); cancelAnimationFrame(raf); };
  }, []);
  if (Platform.OS !== 'web') return null;
  return createElement('canvas', { ref, 'aria-hidden': true, style: { position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 10000 } });
}
