// Yıl özeti (Wrapped) paylaşım görseli: 1080×1920, alıntı hikâyesiyle aynı logo ve tema.
import type { Wrapped } from '../../api/profileDetails';
import { drawArcLogo, ensureFonts, glow, H, MUTED, NEON, SANS, SANS_BOLD, SERIF_BOLD, TEAL, TEXT, W, wrap } from './storyImage';

export const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export async function renderWrappedStory(w: Wrapped, name: string): Promise<Blob> {
  await ensureFonts();
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#04110C'); bg.addColorStop(0.5, '#080B0A'); bg.addColorStop(1, '#0B1F1A');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  glow(ctx, 880, 300, 760, 'rgba(0,217,192,A)', 0.22);
  glow(ctx, 160, 1700, 900, 'rgba(0,229,160,A)', 0.2);
  drawArcLogo(ctx, W / 2, 1150, 820);

  ctx.textAlign = 'center';
  ctx.font = `46px ${SANS_BOLD}`; ctx.fillStyle = TEAL;
  ctx.fillText(`${w.year} ÖZETİM`, W / 2, 560);
  ctx.font = `40px ${SERIF_BOLD}`; ctx.fillStyle = TEXT;
  wrap(ctx, name, 900).slice(0, 1).forEach((l) => ctx.fillText(l, W / 2, 625));

  const stats: [string, string][] = [
    [String(w.books), 'kitap'],
    [w.pages.toLocaleString('tr-TR'), 'sayfa'],
    [w.minutes >= 120 ? `${Math.round(w.minutes / 60)} sa` : `${w.minutes} dk`, 'okuma'],
    [`${w.best_streak} gün`, 'en uzun seri'],
  ];
  stats.forEach(([v, l], i) => {
    const x = i % 2 === 0 ? W / 2 - 230 : W / 2 + 230;
    const y = 820 + Math.floor(i / 2) * 260;
    ctx.font = `120px ${SANS_BOLD}`; ctx.fillStyle = NEON;
    ctx.shadowColor = 'rgba(0,229,160,0.6)'; ctx.shadowBlur = 30;
    ctx.fillText(v, x, y); ctx.shadowBlur = 0;
    ctx.font = `36px ${SANS}`; ctx.fillStyle = MUTED; ctx.fillText(l, x, y + 56);
  });

  let y = 1400;
  ctx.font = `40px ${SANS}`; ctx.fillStyle = TEXT;
  if (w.top_author) { ctx.fillText(`En çok okuduğum yazar: ${w.top_author.name}`, W / 2, y); y += 66; }
  if (w.top_month) { ctx.fillText(`En verimli ayım: ${MONTHS_TR[w.top_month - 1]}`, W / 2, y); y += 66; }
  if (w.quotes || w.reviews) { ctx.fillText(`${w.quotes} alıntı · ${w.reviews} inceleme`, W / 2, y); }

  // Sağ altta: Yakında App Store'da (alıntı hikâyesindeki rozetle aynı)
  ctx.textAlign = 'left';
  ctx.font = `38px ${SANS_BOLD}`;
  const bw = ctx.measureText("App Store'da").width + 72, bh = 116, bx = W - 72 - bw, by = H - 256 - bh;
  ctx.fillStyle = 'rgba(8,11,10,0.82)'; ctx.strokeStyle = 'rgba(0,229,160,0.6)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 26); ctx.fill(); ctx.stroke();
  ctx.font = `24px ${SANS}`; ctx.fillStyle = NEON; ctx.letterSpacing = '4px'; ctx.fillText('YAKINDA', bx + 36, by + 44); ctx.letterSpacing = '0px';
  ctx.font = `38px ${SANS_BOLD}`; ctx.fillStyle = TEXT; ctx.fillText("App Store'da", bx + 36, by + 92);

  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Görsel oluşturulamadı'))), 'image/png'));
}
