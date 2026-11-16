// Ses sahneleri: seçilen sese göre küçük canvas animasyonları (yağmur, şömine, dalga…).
// Her sahne örneği kendi parçacık havuzunu tutar; draw her karede çağrılır.
import type { Rgb, SoundId } from './focusSounds';

export type SceneId = SoundId | 'off';
const rgba = (c: Rgb, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

export function createScene() {
  const pools = new Map<string, Record<string, number | string>[]>();
  const pool = <T extends Record<string, number | string>>(key: string, n: number, make: () => T): T[] => {
    if (!pools.has(key)) pools.set(key, Array.from({ length: n }, make));
    return pools.get(key) as T[];
  };

  return function draw(x: CanvasRenderingContext2D, w: number, h: number, id: SceneId, c: Rgb, t: number, dt: number, scale = 1) {
    const k = Math.max(0.8, scale);
    if (id === 'rain') {
      const P = pool(id, Math.round(40 * scale), () => ({ x: rnd(0, 1), y: rnd(0, 1), v: rnd(0.6, 1.1), l: rnd(0.05, 0.11) }));
      x.strokeStyle = rgba(c, 0.7); x.lineWidth = 1.2 * Math.max(0.7, scale);
      for (const p of P) {
        p.y += p.v * dt * 0.9; if (p.y > 1.1) { p.y = -0.1; p.x = rnd(0, 1); }
        x.beginPath(); x.moveTo(p.x * w - p.l * w * 0.2, p.y * h); x.lineTo(p.x * w, (p.y + p.l) * h); x.stroke();
      }
      for (const r of pool(id + 'r', 4, () => ({ x: rnd(0.15, 0.85), a: rnd(0, 1) }))) {
        r.a += dt * 0.7; if (r.a > 1) { r.a = 0; r.x = rnd(0.15, 0.85); }
        x.strokeStyle = rgba(c, 0.5 * (1 - r.a)); x.beginPath(); x.ellipse(r.x * w, h * 0.9, r.a * w * 0.12, r.a * h * 0.03, 0, 0, TAU); x.stroke();
      }
    } else if (id === 'fire') {
      const fl = 0.75 + 0.25 * Math.sin(t * 9) * Math.sin(t * 5.3);
      const g = x.createRadialGradient(w / 2, h, 0, w / 2, h, h * 0.9);
      g.addColorStop(0, rgba(c, 0.55 * fl)); g.addColorStop(1, rgba(c, 0)); x.fillStyle = g; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 3; i++) {
        const fx = w / 2 + (i - 1) * w * 0.13, fh = h * (0.42 + 0.1 * Math.sin(t * 6 + i * 2)) * (i === 1 ? 1.2 : 0.8);
        x.fillStyle = rgba(i === 1 ? [255, 214, 140] : c, 0.85); x.beginPath(); x.moveTo(fx - w * 0.09, h);
        x.quadraticCurveTo(fx - w * 0.1, h - fh * 0.5, fx + Math.sin(t * 4 + i) * w * 0.03, h - fh);
        x.quadraticCurveTo(fx + w * 0.1, h - fh * 0.5, fx + w * 0.09, h); x.fill();
      }
      for (const e of pool(id, Math.round(18 * scale), () => ({ x: rnd(0.35, 0.65), y: rnd(0.4, 1), v: rnd(0.2, 0.45), s: rnd(0.6, 1.6) }))) {
        e.y -= e.v * dt; e.x += Math.sin(t * 3 + e.s * 5) * dt * 0.05; if (e.y < 0) { e.y = 1; e.x = rnd(0.35, 0.65); }
        x.fillStyle = rgba([255, 220, 150], e.y); x.beginPath(); x.arc(e.x * w, e.y * h, e.s * k, 0, TAU); x.fill();
      }
    } else if (id === 'waves') {
      for (let i = 0; i < 4; i++) {
        x.strokeStyle = rgba(c, 0.25 + i * 0.15); x.lineWidth = 1.5 + i * 0.3; x.beginPath();
        for (let px = 0; px <= w; px += 3) {
          const y = h * (0.45 + i * 0.13) + Math.sin((px / w) * 6 + t * (1 + i * 0.3) + i) * h * 0.045;
          if (px) x.lineTo(px, y); else x.moveTo(px, y);
        }
        x.stroke();
      }
    } else if (id === 'deep') {
      for (let i = 0; i < 3; i++) {
        const r = (t * 0.25 + i / 3) % 1; x.strokeStyle = rgba(c, 0.6 * (1 - r)); x.lineWidth = 2;
        x.beginPath(); x.arc(w / 2, h * 0.5, r * Math.min(w, h) * 0.55, 0, TAU); x.stroke();
      }
      const g = x.createRadialGradient(w / 2, h * 0.5, 0, w / 2, h * 0.5, Math.min(w, h) * 0.2);
      g.addColorStop(0, rgba(c, 0.8)); g.addColorStop(1, rgba(c, 0)); x.fillStyle = g; x.fillRect(0, 0, w, h);
    } else if (id === 'library') {
      const g = x.createLinearGradient(w * 0.2, 0, w * 0.7, h); g.addColorStop(0, rgba(c, 0.28)); g.addColorStop(1, rgba(c, 0));
      x.fillStyle = g; x.beginPath(); x.moveTo(w * 0.25, 0); x.lineTo(w * 0.55, 0); x.lineTo(w * 0.95, h); x.lineTo(w * 0.45, h); x.fill();
      for (const d of pool(id, Math.round(26 * scale), () => ({ x: rnd(0.25, 0.85), y: rnd(0, 1), p: rnd(0, 6) }))) {
        d.y -= dt * 0.03; d.x += Math.sin(t + d.p) * dt * 0.02; if (d.y < 0) d.y = 1;
        x.fillStyle = rgba(c, 0.5 + 0.4 * Math.sin(t * 2 + d.p)); x.beginPath(); x.arc(d.x * w, d.y * h, 1.1 * k, 0, TAU); x.fill();
      }
    } else {
      // Sessiz: yukarı süzülen harfler
      x.textAlign = 'center';
      for (const l of pool(id, Math.round(14 * scale), () => ({ x: rnd(0.1, 0.9), y: rnd(0, 1), ch: 'BOOKFLIXaeğıöşüç'[Math.floor(rnd(0, 16))]!, s: rnd(0.7, 1.2) }))) {
        l.y = (l.y as number) - dt * 0.06; if (l.y < 0) { l.y = 1; l.x = rnd(0.1, 0.9); }
        x.fillStyle = rgba(c, 0.55 * Math.sin((l.y as number) * Math.PI));
        x.font = `${Math.round(13 * (l.s as number) * k)}px Fraunces_400Regular_Italic, Georgia, serif`;
        x.fillText(l.ch as string, (l.x as number) * w, (l.y as number) * h);
      }
    }
  };
}
