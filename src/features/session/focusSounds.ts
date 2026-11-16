// Okuma oturumu odak sesleri: Web Audio ile anlık üretilir (ses dosyası yok, telif yok).
// Yalnızca web'de çalışır; diğer platformlarda SOUNDS_SUPPORTED false döner.
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

export const SOUNDS_SUPPORTED = Platform.OS === 'web' && typeof window !== 'undefined' && 'AudioContext' in window;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sources: AudioScheduledSourceNode[] = [];
let timers: ReturnType<typeof setTimeout>[] = [];
let volume = 0.6;

function noise(c: AudioContext, kind: 'white' | 'pink' | 'brown', seconds = 6): AudioBuffer {
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
    } else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  return buf;
}

function loop(c: AudioContext, buf: AudioBuffer, chain: AudioNode[], gain: number) {
  const src = c.createBufferSource();
  src.buffer = buf; src.loop = true;
  const g = c.createGain(); g.gain.value = gain;
  let node: AudioNode = src;
  for (const n of chain) { node.connect(n); node = n; }
  node.connect(g); g.connect(master!);
  src.start();
  sources.push(src);
}

function filter(c: AudioContext, type: BiquadFilterType, freq: number, q = 0.7) {
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f;
}

// Kısa gürültü patlaması: çıtırtı, damla ya da sayfa sesi.
function burst(c: AudioContext, opts: { dur: number; freq: number; type: BiquadFilterType; peak: number; attack?: number }) {
  const src = c.createBufferSource(); src.buffer = noise(c, 'white', Math.max(0.05, opts.dur));
  const f = filter(c, opts.type, opts.freq, 1.2);
  const g = c.createGain(); const t = c.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(opts.peak, t + (opts.attack ?? 0.003));
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  src.connect(f); f.connect(g); g.connect(master!);
  src.start(t); src.stop(t + opts.dur + 0.05);
}

function every(minMs: number, maxMs: number, fn: () => void) {
  const tick = () => { fn(); timers.push(setTimeout(tick, minMs + Math.random() * (maxMs - minMs))); };
  timers.push(setTimeout(tick, minMs));
}

export function playSound(id: SoundId) {
  if (!SOUNDS_SUPPORTED) return;
  stopSound(true);
  ctx = ctx ?? new AudioContext();
  void ctx.resume();
  const c = ctx;
  master = c.createGain();
  master.gain.setValueAtTime(0, c.currentTime);
  master.gain.linearRampToValueAtTime(volume, c.currentTime + 1.2);
  master.connect(c.destination);

  if (id === 'rain') {
    loop(c, noise(c, 'white'), [filter(c, 'bandpass', 1400, 0.6), filter(c, 'lowpass', 7000)], 0.45);
    loop(c, noise(c, 'brown'), [filter(c, 'lowpass', 400)], 0.35);
    every(40, 180, () => burst(c, { dur: 0.04, freq: 3500 + Math.random() * 3000, type: 'highpass', peak: 0.05 + Math.random() * 0.08 }));
  } else if (id === 'fire') {
    loop(c, noise(c, 'brown'), [filter(c, 'lowpass', 520)], 0.7);
    every(60, 420, () => burst(c, { dur: 0.012 + Math.random() * 0.03, freq: 1800 + Math.random() * 3500, type: 'bandpass', peak: 0.15 + Math.random() * 0.45 }));
  } else if (id === 'waves') {
    // Dalga: gürültünün şiddeti ~11 saniyelik döngüde kabarıp çekilir
    const surge = (buf: AudioBuffer, f: BiquadFilterNode, base: number, depth: number) => {
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const g = c.createGain(); g.gain.value = base;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.09;
      const lg = c.createGain(); lg.gain.value = depth;
      lfo.connect(lg); lg.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(master!);
      src.start(); lfo.start(); sources.push(src, lfo);
    };
    surge(noise(c, 'brown'), filter(c, 'lowpass', 700), 0.55, 0.45);
    surge(noise(c, 'pink'), filter(c, 'highpass', 2200), 0.12, 0.1);
  } else if (id === 'deep') {
    loop(c, noise(c, 'brown'), [filter(c, 'lowpass', 320)], 0.95);
  } else {
    loop(c, noise(c, 'pink'), [filter(c, 'lowpass', 1400)], 0.28);
    every(18000, 40000, () => burst(c, { dur: 0.45, freq: 2200, type: 'bandpass', peak: 0.12, attack: 0.12 }));
  }
}

export function stopSound(immediate = false) {
  timers.forEach(clearTimeout); timers = [];
  const c = ctx; const m = master; const srcs = sources;
  sources = []; master = null;
  if (!c || !m) return;
  if (immediate) { srcs.forEach((s) => { try { s.stop(); } catch { /* zaten durdu */ } }); m.disconnect(); return; }
  m.gain.cancelScheduledValues(c.currentTime);
  m.gain.setValueAtTime(m.gain.value, c.currentTime);
  m.gain.linearRampToValueAtTime(0, c.currentTime + 0.8);
  setTimeout(() => { srcs.forEach((s) => { try { s.stop(); } catch { /* zaten durdu */ } }); m.disconnect(); }, 900);
}

export function setSoundVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (ctx && master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);
}

export function getSoundVolume() { return volume; }
