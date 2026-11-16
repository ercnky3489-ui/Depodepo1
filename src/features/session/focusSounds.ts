// Okuma oturumu odak sesleri. Sesler telifsizdir: Web Audio ile bir kez 40 saniyelik, ek yeri duyulmayan
// bir döngü olarak üretilir (OfflineAudioContext), WAV'a çevrilir ve tek bir <audio> öğesinde döngüyle çalınır.
// <audio> kullanmamızın nedeni: telefon kilitlenince ya da uygulama arka plana geçince Web Audio susar,
// <audio> ise çalmaya devam eder ve kilit ekranında kontrol gösterilebilir. Yalnızca web'de çalışır.
import { Platform } from 'react-native';

export type SoundId = 'rain' | 'fire' | 'waves' | 'deep' | 'library';
export type Rgb = readonly [number, number, number];
// tint: sayaç halkası ve sahne rengi
export const SOUNDS: readonly { id: SoundId; label: string; hint: string; tint: Rgb }[] = [
  { id: 'rain', label: 'Yağmur', hint: 'Cama vuran yumuşak yağmur', tint: [95, 224, 255] },
  { id: 'fire', label: 'Şömine', hint: 'Derin uğultu ve çıtırtılar', tint: [255, 168, 90] },
  { id: 'waves', label: 'Dalgalar', hint: 'Kıyıya vuran sakin deniz', tint: [0, 217, 192] },
  { id: 'deep', label: 'Derin odak', hint: 'Kahverengi gürültü, dikkati toplar', tint: [170, 140, 255] },
  { id: 'library', label: 'Kütüphane', hint: 'Sessiz salon, ara sıra sayfa sesi', tint: [243, 210, 122] },
];
export const SILENT = { label: 'Kapalı', hint: 'Sessizlikte oku', tint: [0, 229, 160] as Rgb };
export const soundLabel = (id: SoundId | null) => (id ? SOUNDS.find((s) => s.id === id)?.label ?? '' : SILENT.label);

export const SOUNDS_SUPPORTED = Platform.OS === 'web' && typeof window !== 'undefined'
  && 'OfflineAudioContext' in window && typeof Audio !== 'undefined';

const RATE = 24000;   // ortam sesleri için yeterli, dosyayı küçük tutar
const LOOP = 40;      // saniye; tüm döngüler (gürültü 8 sn, dalga 10 sn) buna tam bölünür
const XFADE = 1;      // döngü ek yerinde çapraz geçiş (sn)

// ---------------------------------------------------------------- üretim
function noise(c: BaseAudioContext, kind: 'white' | 'pink' | 'brown', seconds = 8): AudioBuffer {
  const len = c.sampleRate * seconds;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w * 0.5;
    else if (kind === 'pink') {
      b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
    } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  }
  // Tampon kendi içinde de döngüye girdiği için başı ve sonu yumuşakça birleştir
  const n = Math.floor(c.sampleRate * 0.05);
  for (let i = 0; i < n; i++) { const k = i / n; d[i] = d[i]! * k + d[len - n + i]! * (1 - k); }
  return buf;
}

function filter(c: BaseAudioContext, type: BiquadFilterType, freq: number, q = 0.7) {
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f;
}

function loopNoise(c: BaseAudioContext, out: AudioNode, buf: AudioBuffer, chain: AudioNode[], gain: number, lfo?: { hz: number; depth: number }) {
  const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
  const g = c.createGain(); g.gain.value = gain;
  let node: AudioNode = src;
  for (const n of chain) { node.connect(n); node = n; }
  node.connect(g); g.connect(out);
  if (lfo) {
    const o = c.createOscillator(); o.frequency.value = lfo.hz;
    const lg = c.createGain(); lg.gain.value = lfo.depth;
    o.connect(lg); lg.connect(g.gain); o.start(0);
  }
  src.start(0);
}

// Kısa gürültü patlaması (damla, çıtırtı, sayfa sesi) belirli bir anda
function burst(c: BaseAudioContext, out: AudioNode, at: number, o: { dur: number; freq: number; type: BiquadFilterType; peak: number; attack?: number }) {
  const src = c.createBufferSource(); src.buffer = noise(c, 'white', Math.max(0.06, o.dur + 0.05));
  const f = filter(c, o.type, o.freq, 1.2);
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(o.peak, at + (o.attack ?? 0.003));
  g.gain.exponentialRampToValueAtTime(0.0001, at + o.dur);
  src.connect(f); f.connect(g); g.connect(out);
  src.start(at); src.stop(at + o.dur + 0.05);
}

function scatter(total: number, minS: number, maxS: number, fn: (at: number) => void) {
  for (let t = minS * Math.random(); t < total - 0.5; t += minS + Math.random() * (maxS - minS)) fn(t);
}

async function render(id: SoundId): Promise<AudioBuffer> {
  const total = LOOP + XFADE;
  const c = new OfflineAudioContext(1, Math.ceil(RATE * total), RATE);
  const out = c.createGain(); out.gain.value = 1; out.connect(c.destination);
  if (id === 'rain') {
    loopNoise(c, out, noise(c, 'white'), [filter(c, 'bandpass', 1400, 0.6), filter(c, 'lowpass', 7000)], 0.45);
    loopNoise(c, out, noise(c, 'brown'), [filter(c, 'lowpass', 400)], 0.35);
    scatter(total, 0.04, 0.18, (at) => burst(c, out, at, { dur: 0.04, freq: 3500 + Math.random() * 3000, type: 'highpass', peak: 0.05 + Math.random() * 0.08 }));
  } else if (id === 'fire') {
    loopNoise(c, out, noise(c, 'brown'), [filter(c, 'lowpass', 520)], 0.7);
    scatter(total, 0.06, 0.42, (at) => burst(c, out, at, { dur: 0.012 + Math.random() * 0.03, freq: 1800 + Math.random() * 3500, type: 'bandpass', peak: 0.15 + Math.random() * 0.45 }));
  } else if (id === 'waves') {
    loopNoise(c, out, noise(c, 'brown'), [filter(c, 'lowpass', 700)], 0.55, { hz: 0.1, depth: 0.45 });
    loopNoise(c, out, noise(c, 'pink'), [filter(c, 'highpass', 2200)], 0.12, { hz: 0.1, depth: 0.1 });
  } else if (id === 'deep') {
    loopNoise(c, out, noise(c, 'brown'), [filter(c, 'lowpass', 320)], 0.95);
  } else {
    loopNoise(c, out, noise(c, 'pink'), [filter(c, 'lowpass', 1400)], 0.28);
    scatter(total, 9, 18, (at) => burst(c, out, at, { dur: 0.45, freq: 2200, type: 'bandpass', peak: 0.12, attack: 0.12 }));
  }
  return c.startRendering();
}

// Sonu başa çapraz geçirip tam LOOP saniyelik, ek yeri duyulmayan bir döngü yap
function seamless(buf: AudioBuffer, gain: number): Float32Array {
  const d = buf.getChannelData(0);
  const L = RATE * LOOP, n = RATE * XFADE;
  const out = new Float32Array(L);
  for (let i = 0; i < L; i++) out[i] = d[i]! * gain;
  for (let i = 0; i < n; i++) { const k = i / n; out[i] = (d[i]! * k + d[L + i]! * (1 - k)) * gain; }
  return out;
}

function wav(samples: Float32Array): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(bytes);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, RATE, true);
  v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) { const s = Math.max(-1, Math.min(1, samples[i]!)); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  return new Blob([bytes], { type: 'audio/wav' });
}

// ---------------------------------------------------------------- çalma
const rendered = new Map<SoundId, Promise<AudioBuffer>>();
const urls = new Map<string, string>();
let el: HTMLAudioElement | null = null;
let current: SoundId | null = null;
let volume = 0.6;
let volumeWorks: boolean | null = null; // iOS'ta audio.volume değiştirilemez: o zaman ses düzeyi dosyaya işlenir
let token = 0;

// Sessiz, kısa bir dosya: dokunuş anında öğeyi "açmak" için (iOS ancak dokunuşla çalmaya izin verir)
let silence: string | null = null;
const silentUrl = () => (silence ??= URL.createObjectURL(wav(new Float32Array(RATE / 4))));

function audio(): HTMLAudioElement {
  if (!el) {
    el = new Audio(); el.loop = true; el.preload = 'auto';
    el.setAttribute('playsinline', ''); el.setAttribute('x-webkit-airplay', 'deny');
  }
  return el;
}

function bufferFor(id: SoundId) {
  let p = rendered.get(id);
  if (!p) { p = render(id); rendered.set(id, p); p.catch(() => rendered.delete(id)); }
  return p;
}

async function urlFor(id: SoundId, gain: number) {
  const key = `${id}:${gain.toFixed(1)}`;
  const hit = urls.get(key); if (hit) return hit;
  const u = URL.createObjectURL(wav(seamless(await bufferFor(id), gain)));
  urls.set(key, u);
  return u;
}

function checkVolume(a: HTMLAudioElement) {
  if (volumeWorks !== null) return;
  try { a.volume = 0.5; volumeWorks = Math.abs(a.volume - 0.5) < 0.01; } catch { volumeWorks = false; }
}

/** Arka planda sesleri önceden üret (oturum ekranı açılınca çağrılır). */
export function prepareSounds() {
  if (!SOUNDS_SUPPORTED) return;
  const ids = SOUNDS.map((s) => s.id);
  const next = () => { const id = ids.shift(); if (id) bufferFor(id).then(() => setTimeout(next, 50), () => undefined); };
  setTimeout(next, 300);
}

/** Bir dokunuşun içinden çağır: ses seçilir ve çalmaya başlar. */
export function playSound(id: SoundId): Promise<void> {
  if (!SOUNDS_SUPPORTED) return Promise.resolve();
  const a = audio(); checkVolume(a);
  current = id; const my = ++token;
  // Dokunuş anında öğeyi aç; asıl ses hazır olunca kaynak değiştirilir
  if (a.paused) { a.src = silentUrl(); a.play().catch(() => undefined); }
  return urlFor(id, volumeWorks ? 1 : volume).then((u) => {
    if (my !== token) return;
    a.src = u; a.loop = true;
    if (volumeWorks) a.volume = volume;
    return a.play().then(() => undefined, () => undefined);
  });
}

export function pauseSound() { if (el && !el.paused) el.pause(); }
export function resumeSound(): Promise<void> {
  if (!current) return Promise.resolve();
  if (el && el.src && el.src !== silence) return el.play().then(() => undefined, () => undefined);
  return playSound(current);
}

export function stopSound(_immediate = false) {
  token++; current = null;
  if (el) { el.pause(); el.removeAttribute('src'); el.load(); }
}

export function isSoundPlaying() { return !!el && !el.paused && !!current; }

let volTimer: ReturnType<typeof setTimeout> | null = null;
export function setSoundVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (!el || !current) return;
  if (volumeWorks) { el.volume = volume; return; }
  // iOS: ses düzeyi işlenmiş dosyaya geç, kaldığı yerden devam et
  if (volTimer) clearTimeout(volTimer);
  volTimer = setTimeout(() => {
    const id = current; const a = el; if (!id || !a) return;
    const at = a.currentTime, playing = !a.paused, my = ++token;
    urlFor(id, volume).then((u) => {
      if (my !== token) return;
      a.src = u; a.currentTime = at;
      if (playing) a.play().catch(() => undefined);
    });
  }, 250);
}

export function getSoundVolume() { return volume; }

/** Kilit ekranı/bildirim alanı kontrolleri için çalan öğe. */
export function soundElement() { return el; }
