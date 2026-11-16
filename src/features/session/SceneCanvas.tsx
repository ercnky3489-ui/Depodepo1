// Ses sahnesini çizen canvas. Yalnızca web'de çizer; diğer platformlarda boş alan bırakır.
import { createElement, useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import type { Rgb } from './focusSounds';
import { createScene, type SceneId } from './scene';

type Props = { id: SceneId; tint: Rgb; width: number; height: number; running?: boolean; scale?: number; opacity?: number; round?: boolean };

export function SceneCanvas({ id, tint, width, height, running = true, scale = 1, opacity = 1, round }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const live = useRef({ id, tint, running, scale });
  live.current = { id, tint, running, scale };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const cv = ref.current; if (!cv) return;
    const draw = createScene();
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, last = performance.now(), t = 0;
    const frame = (now: number) => {
      const real = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
      const { id: sid, tint: c, running: run, scale: sc } = live.current;
      const dt = run && !reduce ? real : 0; t += dt;
      const d = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(width * d)) { cv.width = Math.round(width * d); cv.height = Math.round(height * d); }
      const x = cv.getContext('2d');
      if (x) { x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, width, height); draw(x, width, height, sid, c, t, dt, sc); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  if (Platform.OS !== 'web') return <View style={{ width, height }} />;
  return createElement('canvas', {
    ref, 'aria-hidden': true,
    style: { width, height, opacity, borderRadius: round ? '50%' : 0, display: 'block', pointerEvents: 'none', transition: 'opacity .4s' },
  });
}
