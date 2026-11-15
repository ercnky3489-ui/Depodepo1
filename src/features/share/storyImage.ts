// Instagram hikâyesi için alıntı görseli (1080×1920 PNG), yalnızca web'de canvas ile çizilir.
// Kapak görselleri başka alan adından geldiği ve CORS izni olmadığı için çizilmez (canvas kirlenir, kaydedilemez).

export interface QuoteStory {
  body: string;
  title: string;
  author?: string | null;
  page?: number | null;
  sharedBy?: string | null; // görünen ad
  username?: string | null;
  siteUrl: string;
}

const W = 1080;
const H = 1920;
const NEON = '#00E5A0';
const TEAL = '#00D9C0';
const TEXT = '#F4F8F5';
const MUTED = '#8C9B94';
const SERIF = 'Fraunces_400Regular, Fraunces, Georgia, serif';
const SERIF_BOLD = 'Fraunces_700Bold, Fraunces, Georgia, serif';
const SANS = 'Inter_600SemiBold, Inter, system-ui, sans-serif';
const SANS_BOLD = 'Inter_800ExtraBold, Inter, system-ui, sans-serif';

async function ensureFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all(
    ['60px Fraunces_400Regular', '60px Fraunces_700Bold', '40px Inter_600SemiBold', '40px Inter_800ExtraBold']
      .map((f) => document.fonts.load(f).catch(() => undefined)),
  );
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.replace(/\s+\n/g, '\n').split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; }
      else line = next;
    }
    lines.push(line);
  }
  return lines;
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, c.replace('A', String(a)));
  g.addColorStop(1, c.replace('A', '0'));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// "BOOKFLIX" bir dairenin üst yayına dizilir (∩); altında hilal biçimli neon bir ay çizilir.
function drawArcLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.font = `104px ${SANS_BOLD}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  const chars = [...'BOOKFLIX'];
  const spacing = 14;
  const widths = chars.map((ch) => ctx.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  let angle = -Math.PI / 2 - total / r / 2;
  chars.forEach((ch, i) => {
    const w = widths[i]!;
    const a = angle + (w - spacing) / 2 / r;
    ctx.save();
    ctx.translate(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.rotate(a + Math.PI / 2);
    const neon = i >= 4;
    ctx.fillStyle = neon ? NEON : TEXT;
    ctx.shadowColor = neon ? 'rgba(0,229,160,0.85)' : 'rgba(255,255,255,0.25)';
    ctx.shadowBlur = neon ? 34 : 10;
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    angle += w / r;
  });

  // Hilal: yay boyunca kalınlığı sinüsle değişen neon şerit; ortası kalın (18 px), uçları sivri.
  const rr = r - 46;
  const span = total / r + 0.42;
  const start = -Math.PI / 2 - span / 2;
  const N = 120;
  ctx.shadowColor = 'rgba(0,229,160,0.9)';
  ctx.shadowBlur = 36;
  ctx.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const f = (i + 0.5) / N;
    const t0 = start + (span * i) / N;
    const t1 = start + (span * (i + 1)) / N + 0.002;
    const w = 1 + 17 * Math.sin(Math.PI * f) ** 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy + w / 2, rr, t0, t1);
    ctx.lineWidth = w;
    ctx.strokeStyle = `rgba(${Math.round(0 + 0)}, ${Math.round(217 + 12 * Math.sin(Math.PI * f))}, ${Math.round(192 - 32 * Math.sin(Math.PI * f))}, ${0.25 + 0.75 * Math.sin(Math.PI * f)})`;
    ctx.stroke();
  }
  ctx.restore();
}

export async function renderQuoteStory(q: QuoteStory): Promise<Blob> {
  await ensureFonts();
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Zemin: koyu gradyan + neon ışıltılar + ince çizgi dokusu
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#071210');
  bg.addColorStop(0.55, '#080B0A');
  bg.addColorStop(1, '#04110C');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  glow(ctx, 900, 260, 760, 'rgba(0,217,192,A)', 0.22);
  glow(ctx, 120, 1680, 900, 'rgba(0,229,160,A)', 0.18);
  glow(ctx, 540, 980, 620, 'rgba(0,229,160,A)', 0.06);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#ffffff';
  for (let y = 0; y < H; y += 6) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
  ctx.restore();

  // Instagram üst/alt arayüzü ~250 px kapatır; logo ve alt bilgi bu güvenli alanın içinde kalır.
  drawArcLogo(ctx, W / 2, 1150, 820);

  // Alıntı: kutuya sığacak en büyük yazı boyutu
  const boxTop = 460;
  const boxBottom = 1230;
  const maxW = 860;
  let size = 76;
  let lines: string[] = [];
  for (; size >= 38; size -= 2) {
    ctx.font = `${size}px ${SERIF}`;
    lines = wrap(ctx, q.body.trim(), maxW);
    if (lines.length * size * 1.36 <= boxBottom - boxTop - 160) break;
  }
  if (lines.length * size * 1.36 > boxBottom - boxTop - 160) {
    // Çok uzun alıntı: kırp ve üç nokta koy
    const max = Math.floor((boxBottom - boxTop - 160) / (size * 1.36));
    lines = lines.slice(0, max);
    lines[max - 1] = lines[max - 1]!.replace(/\s*\S*$/, '') + '…';
  }
  const lh = size * 1.36;
  const blockH = 150 + lines.length * lh;
  let y = boxTop + (boxBottom - boxTop - blockH) / 2;

  ctx.textAlign = 'center';
  ctx.font = `230px ${SERIF_BOLD}`;
  ctx.fillStyle = NEON;
  ctx.shadowColor = 'rgba(0,229,160,0.7)';
  ctx.shadowBlur = 40;
  ctx.fillText('“', W / 2, y + 170);
  ctx.shadowBlur = 0;
  y += 150;

  ctx.font = `${size}px ${SERIF}`;
  ctx.fillStyle = TEXT;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, y + size + i * lh));
  ctx.shadowBlur = 0;

  // Ayırıcı ve kaynak
  let sy = Math.max(boxBottom + 30, y + lines.length * lh + 90);
  const div = ctx.createLinearGradient(W / 2 - 160, 0, W / 2 + 160, 0);
  div.addColorStop(0, 'rgba(0,229,160,0)');
  div.addColorStop(0.5, NEON);
  div.addColorStop(1, 'rgba(0,229,160,0)');
  ctx.fillStyle = div;
  ctx.fillRect(W / 2 - 160, sy, 320, 4);
  sy += 82;
  ctx.font = `50px ${SERIF_BOLD}`;
  ctx.fillStyle = TEXT;
  const titleLines = wrap(ctx, q.title, 900).slice(0, 2);
  titleLines.forEach((l, i) => ctx.fillText(l, W / 2, sy + i * 62));
  sy += titleLines.length * 62 + 4;
  const meta = [q.author, q.page ? `Sayfa ${q.page}` : null].filter(Boolean).join('  ·  ');
  if (meta) {
    ctx.font = `36px ${SANS}`;
    ctx.fillStyle = TEAL;
    ctx.fillText(meta, W / 2, sy + 10);
  }

  // Sağ alt: "Yakında App Store'da" rozeti (Instagram'ın alt mesaj çubuğunun üstünde kalır).
  ctx.textAlign = 'left';
  ctx.font = `24px ${SANS}`;
  const small = 'YAKINDA';
  ctx.font = `38px ${SANS_BOLD}`;
  const big = "App Store'da";
  const bw = Math.max(ctx.measureText(big).width, 0) + 72;
  const bh = 116;
  const bx = W - 72 - bw;
  const by = H - 256 - bh;
  ctx.fillStyle = 'rgba(8,11,10,0.82)';
  ctx.strokeStyle = 'rgba(0,229,160,0.6)';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(0,229,160,0.35)';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 26);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.font = `24px ${SANS}`;
  ctx.fillStyle = NEON;
  ctx.letterSpacing = '4px';
  ctx.fillText(small, bx + 36, by + 44);
  ctx.letterSpacing = '0px';
  ctx.font = `38px ${SANS_BOLD}`;
  ctx.fillStyle = TEXT;
  ctx.fillText(big, bx + 36, by + 92);
  ctx.textAlign = 'center';

  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Görsel oluşturulamadı'))), 'image/png'));
}
