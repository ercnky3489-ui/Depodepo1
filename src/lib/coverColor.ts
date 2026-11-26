// Kapağın baskın rengi: kitap sayfasının zemini bu renge bürünür.
// Web'de kapak küçük bir tuvale çizilip ortalama alınır. Kapak sunucusu izin vermezse (CORS) ya da
// mağaza uygulamasında, kitaba özgü sabit bir renk kullanılır.
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { placeholderColor } from './images';
import { color, isDark } from '../theme/tokens';

const cache = new Map<string, string>();

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Çok açık/çok koyu renkleri zemine uygun, doygun ama koyu bir tona çek
function tone(rgb: [number, number, number]): string {
  const dark = darkTone(rgb);
  if (isDark) return dark;
  // Açık ve sepya temada: kapak rengini zemin rengiyle karıştırıp açık bir pastel elde et (koyu yazı okunur kalsın)
  const [r, g, b] = dark.match(/\d+/g)!.map(Number) as [number, number, number];
  const [br, bgc, bb] = hexToRgb(color.bg);
  const mix = (v: number, w: number) => Math.round(v * 0.38 + w * 0.62);
  return `rgb(${mix(r * 1.6, br)},${mix(g * 1.6, bgc)},${mix(b * 1.6, bb)})`.replace(/\d+/g, (n) => String(Math.min(255, Number(n))));
}

function darkTone([r, g, b]: [number, number, number]): string {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  const k = l > 0.45 ? 0.45 / l : l < 0.18 ? 0.18 / Math.max(l, 0.02) : 1;
  const sat = (v: number) => Math.round(Math.max(0, Math.min(255, ((v - (max + min) / 2) * 1.35 + (max + min) / 2) * k)));
  return `rgb(${sat(r)},${sat(g)},${sat(b)})`;
}

export function useCoverColor(url: string | null, id: string): string {
  const fallback = tone(hexToRgb(placeholderColor(id)));
  const [c, setC] = useState(() => (url && cache.get(url)) || fallback);
  useEffect(() => {
    if (!url) { setC(fallback); return; }
    const hit = cache.get(url); if (hit) { setC(hit); return; }
    if (Platform.OS !== 'web' || typeof Image === 'undefined') return;
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const cv = document.createElement('canvas'); cv.width = 12; cv.height = 18;
        const x = cv.getContext('2d'); if (!x) return;
        x.drawImage(img, 0, 0, 12, 18);
        const d = x.getImageData(0, 0, 12, 18).data;
        let r = 0, g = 0, b = 0, w = 0;
        for (let i = 0; i < d.length; i += 4) {
          const R = d[i]!, G = d[i + 1]!, B = d[i + 2]!;
          const s = Math.max(R, G, B) - Math.min(R, G, B); // doygun piksellere daha çok ağırlık
          const wt = 1 + s / 32;
          r += R * wt; g += G * wt; b += B * wt; w += wt;
        }
        const out = tone([r / w, g / w, b / w]);
        cache.set(url, out);
        if (alive) setC(out);
      } catch { /* tuval okunamadı: sabit renk kalır */ }
    };
    img.src = url;
    return () => { alive = false; };
  }, [url, fallback]);
  return c;
}
