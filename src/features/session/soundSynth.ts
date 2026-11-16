// Odak seslerinin üretimi: saf JavaScript ile, örnek örnek. 10 dakikalık, ek yeri duyulmayan bir döngü üretir.
// Web Audio'ya bağlı değildir; çıktı 16 bit mono PCM'dir (WAV'a sarılıp <audio> ile çalınır).
// Uzun döngünün nedeni: iPhone arka planda kısa döngülerin sonunda takılıp yeniden başlatıyor.

export type SynthId = 'rain' | 'storm' | 'fire' | 'waves' | 'deep' | 'library';
export const RATE = 22050;
export const DURATION = 600; // saniye (10 dk)
const XF = 3;                // döngü ek yerinde çapraz geçiş (sn)

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const white = () => Math.random() * 2 - 1;

// RBJ biquad süzgeç
class Biquad {
  b0 = 1; b1 = 0; b2 = 0; a1 = 0; a2 = 0; x1 = 0; x2 = 0; y1 = 0; y2 = 0;
  constructor(type: 'lp' | 'hp' | 'bp', freq: number, q = 0.707) { this.set(type, freq, q); }
  set(type: 'lp' | 'hp' | 'bp', freq: number, q = 0.707) {
    const w = (2 * Math.PI * Math.min(freq, RATE * 0.45)) / RATE, cs = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al;
    if (type === 'lp') { this.b0 = (1 - cs) / 2 / a0; this.b1 = (1 - cs) / a0; this.b2 = this.b0; }
    else if (type === 'hp') { this.b0 = (1 + cs) / 2 / a0; this.b1 = -(1 + cs) / a0; this.b2 = this.b0; }
    else { this.b0 = al / a0; this.b1 = 0; this.b2 = -al / a0; }
    this.a1 = (-2 * cs) / a0; this.a2 = (1 - al) / a0;
  }
  run(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y;
  }
}

class Pink { b0 = 0; b1 = 0; b2 = 0; run() { const w = white(); this.b0 = 0.99765 * this.b0 + w * 0.099046; this.b1 = 0.963 * this.b1 + w * 0.2965164; this.b2 = 0.57 * this.b2 + w * 1.0526913; return (this.b0 + this.b1 + this.b2 + w * 0.1848) * 0.11; } }
class Brown { v = 0; run() { this.v = (this.v + 0.02 * white()) / 1.02; return this.v * 3.5; } }

// Yavaş, rastgele dolaşan değer (doğal dalgalanma için): her `sec` saniyede yeni hedefe yumuşakça gider
class Drift {
  v: number; target: number; k: number; n = 0; every: number;
  constructor(private lo: number, private hi: number, sec: number) { this.v = rnd(lo, hi); this.target = rnd(lo, hi); this.every = Math.floor(sec * RATE); this.k = 1 / (sec * RATE * 0.5); }
  run() { if (++this.n >= this.every) { this.n = 0; this.target = rnd(this.lo, this.hi); } this.v += (this.target - this.v) * this.k; return this.v; }
}

// Kısa ses olayı (çıtırtı, damla, gök gürültüsü…): kendi süzgeci ve zarfı olan bir ses
type Voice = { left: number; run: () => number };
function burst(o: { freq: number; type?: 'lp' | 'hp' | 'bp'; q?: number; peak: number; attack: number; decay: number; src?: 'white' | 'pink' | 'brown' }): Voice {
  const f = new Biquad(o.type ?? 'bp', o.freq, o.q ?? 1.2);
  const a = Math.max(1, Math.floor(o.attack * RATE)), d = Math.max(1, Math.floor(o.decay * RATE));
  const pk = o.src === 'pink' ? new Pink() : o.src === 'brown' ? new Brown() : null;
  const k = Math.exp(Math.log(0.001) / d);
  let i = 0, env = 0;
  return {
    left: a + d,
    run() {
      env = i < a ? (i / a) * o.peak : env * k; i++; this.left--;
      return f.run(pk ? pk.run() : white()) * env;
    },
  };
}

// Gök gürültüsü: yavaş başlayan, kendi içinde gürleyip sönen alçak frekanslı uğultu (yakınsa önce şimşek çatırtısı)
function thunder(near: boolean): Voice[] {
  const len = rnd(5, 9), peak = near ? rnd(0.9, 1.3) : rnd(0.35, 0.6);
  const lp = new Biquad('lp', near ? 260 : 150, 0.8), lp2 = new Biquad('lp', near ? 420 : 220, 0.7);
  const b = new Brown(), roll = new Drift(0.35, 1, 0.35);
  const total = Math.floor(len * RATE), att = Math.floor(rnd(0.15, near ? 0.4 : 1.2) * RATE);
  let i = 0;
  const rumble: Voice = {
    left: total,
    run() {
      const t = i / total; i++; this.left--;
      const env = i < att ? i / att : Math.pow(1 - t, 1.6);
      return lp2.run(lp.run(b.run() * 3)) * env * roll.run() * peak;
    },
  };
  return near ? [burst({ freq: 3000, type: 'hp', q: 0.7, peak: 0.35, attack: 0.002, decay: 0.25 }), rumble] : [rumble];
}

type Gen = { next: () => number };

function make(id: SynthId): Gen {
  const voices: Voice[] = [];
  const add = (v: Voice | Voice[]) => { if (Array.isArray(v)) voices.push(...v); else voices.push(v); };
  const mix = () => { let s = 0; for (let i = voices.length - 1; i >= 0; i--) { const v = voices[i]!; s += v.run(); if (v.left <= 0) voices.splice(i, 1); } return s; };
  const chance = (perSec: number) => Math.random() < perSec / RATE;

  if (id === 'rain' || id === 'storm') {
    const heavy = id === 'storm';
    const w1 = new Biquad('bp', 1400, 0.6), w2 = new Biquad('lp', 6500), br = new Brown(), bl = new Biquad('lp', 400);
    const inten = new Drift(heavy ? 0.9 : 0.75, heavy ? 1.25 : 1.05, 6);
    const wind = new Pink(), wf = new Biquad('bp', 500, 0.8), windAmp = new Drift(0.02, heavy ? 0.22 : 0.06, 5), windF = new Drift(300, 900, 7);
    let n = 0, nextThunder = Math.floor(rnd(8, 25) * RATE);
    return {
      next() {
        const k = inten.run();
        if (++n % 512 === 0) wf.set('bp', windF.run(), 0.8); else windF.run();
        let s = w2.run(w1.run(white())) * 0.42 * k + bl.run(br.run()) * (heavy ? 0.45 : 0.33);
        s += wf.run(wind.run()) * windAmp.run() * 3;
        if (chance(heavy ? 14 : 9) ) add(burst({ freq: rnd(3200, 6500), type: 'hp', q: 0.9, peak: rnd(0.03, 0.11), attack: 0.0015, decay: rnd(0.02, 0.05) }));
        if (heavy && --nextThunder <= 0) { add(thunder(Math.random() < 0.4)); nextThunder = Math.floor(rnd(25, 70) * RATE); }
        return s + mix();
      },
    };
  }

  if (id === 'fire') {
    // Yumuşak uğultu + titreşen alev + seyrek, kümeli ve yumuşak çıtırtılar
    const br = new Brown(), lp = new Biquad('lp', 330, 0.6), pk = new Pink(), bp = new Biquad('bp', 850, 0.5), hs = new Biquad('hp', 5200, 0.7);
    const flick = new Drift(0.6, 1.15, 0.4), glow = new Drift(0.8, 1.1, 8);
    let cluster = 0;
    return {
      next() {
        const f = flick.run(), g = glow.run();
        let s = lp.run(br.run()) * 0.5 * g + bp.run(pk.run()) * 0.11 * f * g + hs.run(white()) * 0.006 * f;
        if (cluster > 0 && chance(18)) { cluster--; add(burst({ freq: rnd(1800, 4200), q: 1.4, peak: rnd(0.03, 0.12), attack: 0.0008, decay: rnd(0.006, 0.02) })); }
        if (chance(1.6)) cluster = Math.floor(rnd(1, 6));
        if (chance(0.12)) add(burst({ freq: rnd(500, 900), q: 1, peak: rnd(0.08, 0.16), attack: 0.002, decay: rnd(0.05, 0.09) }));
        return s + mix();
      },
    };
  }

  if (id === 'waves') {
    // Her dalga farklı uzunlukta: yavaşça kabarır, kıyıya vurur, köpükle çekilir
    const br = new Brown(), lp = new Biquad('lp', 600, 0.7), pk = new Pink(), hp = new Biquad('hp', 2000, 0.7), lp2 = new Biquad('lp', 7000);
    let t = 0, len = rnd(7, 12) * RATE, amp = rnd(0.7, 1);
    return {
      next() {
        if (++t >= len) { t = 0; len = rnd(7, 13) * RATE; amp = rnd(0.65, 1); }
        const x = t / len;
        const body = x < 0.55 ? Math.pow(x / 0.55, 2) : Math.pow(1 - (x - 0.55) / 0.45, 1.5);
        const foam = x < 0.5 ? 0 : Math.sin(((x - 0.5) / 0.5) * Math.PI);
        return lp.run(br.run()) * (0.2 + 0.6 * body * amp) + lp2.run(hp.run(pk.run())) * (0.03 + 0.22 * foam * amp);
      },
    };
  }

  if (id === 'deep') {
    const br = new Brown(), lp = new Biquad('lp', 320, 0.6), d = new Drift(0.88, 1.05, 10);
    return { next: () => lp.run(br.run()) * 0.95 * d.run() };
  }

  // Kütüphane: sessiz salon uğultusu, ara sıra sayfa çevirme
  const pk = new Pink(), lp = new Biquad('lp', 1200, 0.6), d = new Drift(0.85, 1.05, 12);
  let nextPage = Math.floor(rnd(6, 20) * RATE);
  return {
    next() {
      if (--nextPage <= 0) {
        nextPage = Math.floor(rnd(15, 45) * RATE);
        for (let i = 0; i < 3; i++) add(burst({ freq: rnd(1800, 3200), q: 0.8, peak: rnd(0.04, 0.08), attack: rnd(0.04, 0.1), decay: rnd(0.12, 0.25), src: 'pink' }));
      }
      return lp.run(pk.run()) * 0.26 * d.run() + mix();
    },
  };
}

/** 10 dakikalık döngüyü üretir; arada tarayıcıya nefes aldırır. Dönen dizi gain=1 seviyesindedir. */
export async function synth(id: SynthId, shouldStop: () => boolean = () => false): Promise<Int16Array | null> {
  const g = make(id);
  const gain = ({ fire: 1.35, waves: 1.35, library: 1.6 } as Partial<Record<SynthId, number>>)[id] ?? 1; // sesler arası düzey dengesi
  const L = DURATION * RATE, X = XF * RATE;
  const out = new Int16Array(L);
  const head = new Float32Array(X);
  const shape = (v: number) => Math.tanh(v * 0.95); // yumuşak sınırlayıcı: patlama/çatlama olmasın
  const CHUNK = RATE * 5;
  for (let i = 0; i < L + X; i++) {
    let v = g.next() * gain;
    if (i < X) head[i] = v;
    if (i >= L) { const j = i - L, k = j / X; v = head[j]! * k + v * (1 - k); out[j] = Math.round(shape(v) * 32767); continue; }
    out[i] = Math.round(shape(v) * 32767);
    if (i % CHUNK === 0 && i) { await new Promise((r) => setTimeout(r, 0)); if (shouldStop()) return null; }
  }
  return out;
}

export function wavBlob(pcm: Int16Array, gain = 1): Blob {
  const n = pcm.length, bytes = new ArrayBuffer(44 + n * 2), v = new DataView(bytes);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, RATE, true);
  v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
  const data = new Int16Array(bytes, 44, n);
  if (gain === 1) data.set(pcm); else for (let i = 0; i < n; i++) data[i] = Math.round(pcm[i]! * gain);
  return new Blob([bytes], { type: 'audio/wav' });
}
