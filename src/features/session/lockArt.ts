// Kilit ekranı görseli ("3B kitap"): kapak, sayfa kalınlığı ve gölgesiyle 3 boyutlu bir kitap gibi,
// sesin renginde bir zeminde durur. Kapak sunucusu tarayıcının görseli okumasına izin vermezse (CORS)
// aynı kitap, kitabın adı ve yazarıyla BOOKFLIX tarzı bir kapakla çizilir. Sonuç 512×512 PNG adresidir.
import type { Rgb } from './focusSounds';

const S = 512;
const rgba = (c: Rgb, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const t = setTimeout(() => resolve(null), 6000);
    img.onload = () => { clearTimeout(t); resolve(img); };
    img.onerror = () => { clearTimeout(t); resolve(null); };
    img.src = src;
  });
}

function wrap(x: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/); const lines: string[] = []; let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (x.measureText(t).width <= maxW || !line) line = t; else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1]!.replace(/\s*\S*$/, '') + '…'; }
  return lines;
}

// Kapağı okunamayan kitaplar için yazı tabanlı kapak
function typeCover(title: string, author: string | null, tint: Rgb): HTMLCanvasElement {
  const W = 400, H = 600, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#12352B'); g.addColorStop(1, '#060F0C'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(W * 0.7, H * 0.25, 10, W * 0.7, H * 0.25, W * 0.9); glow.addColorStop(0, rgba(tint, 0.35)); glow.addColorStop(1, rgba(tint, 0)); x.fillStyle = glow; x.fillRect(0, 0, W, H);
  x.strokeStyle = rgba(tint, 0.85); x.lineWidth = 3; x.strokeRect(22, 22, W - 44, H - 44);
  x.fillStyle = '#F4F8F5'; x.textAlign = 'center';
  let size = 54; x.font = `${size}px Fraunces_700Bold, Georgia, serif`;
  let lines = wrap(x, title, W - 90, 5);
  if (lines.length > 3) { size = 42; x.font = `${size}px Fraunces_700Bold, Georgia, serif`; lines = wrap(x, title, W - 90, 6); }
  const top = H * 0.42 - (lines.length * size * 1.12) / 2;
  lines.forEach((l, i) => x.fillText(l, W / 2, top + (i + 1) * size * 1.12));
  x.fillStyle = rgba(tint, 1); x.fillRect(W / 2 - 30, top + lines.length * size * 1.12 + 26, 60, 3);
  if (author) { x.fillStyle = '#B9C6C0'; x.font = '600 20px Inter_600SemiBold, Inter, sans-serif'; x.fillText(author.toLocaleUpperCase('tr-TR').slice(0, 32), W / 2, H - 92); }
  x.fillStyle = '#00E5A0'; x.font = '800 18px Inter_800ExtraBold, Inter, sans-serif'; x.fillText('BOOKFLIX', W / 2, H - 50);
  return cv;
}

function draw3d(cover: CanvasImageSource, ratio: number, tint: Rgb): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const x = cv.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, rgba(tint, 0.95)); g.addColorStop(1, '#06120E'); x.fillStyle = g; x.fillRect(0, 0, S, S);
  const h = S * 0.8, w = Math.min(S * 0.66, h * ratio), X = (S - w) / 2 - 12, Y = (S - h) / 2;
  // zemindeki gölge
  x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(S / 2 + 20, Y + h + 14, w * 0.7, 18, 0, 0, Math.PI * 2); x.fill();
  // sayfa kalınlığı
  x.fillStyle = '#F2EEE4'; x.beginPath(); x.moveTo(X + w, Y + 6); x.lineTo(X + w + 26, Y + 18); x.lineTo(X + w + 26, Y + h + 8); x.lineTo(X + w, Y + h - 2); x.fill();
  x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 1;
  for (let i = 1; i < 9; i++) { x.beginPath(); x.moveTo(X + w + i * 3, Y + 7 + i * 1.4); x.lineTo(X + w + i * 3, Y + h - 1 + i * 1.1); x.stroke(); }
  // kapak
  x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 24; x.shadowOffsetX = 8;
  x.drawImage(cover, X, Y, w, h);
  x.shadowBlur = 0; x.shadowOffsetX = 0;
  // cilt gölgesi
  const sh = x.createLinearGradient(X, 0, X + 26, 0); sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = sh; x.fillRect(X, Y, 26, h);
  return cv;
}

const toUrl = (cv: HTMLCanvasElement) => new Promise<string | null>((resolve) => {
  try { cv.toBlob((b) => resolve(b ? URL.createObjectURL(b) : null), 'image/png'); } catch { resolve(null); }
});

const cache = new Map<string, Promise<string | null>>();

export function bookArt(o: { key: string; cover: string | null; title: string; author: string | null; tint: Rgb }): Promise<string | null> {
  const hit = cache.get(o.key); if (hit) return hit;
  const p = (async () => {
    const img = o.cover ? await loadImage(o.cover) : null;
    if (img) {
      const url = await toUrl(draw3d(img, img.width / img.height, o.tint));
      if (url) return url;
    }
    return toUrl(draw3d(typeCover(o.title, o.author, o.tint), 400 / 600, o.tint));
  })();
  cache.set(o.key, p);
  return p;
}
