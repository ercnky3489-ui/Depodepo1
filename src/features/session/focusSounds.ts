// Okuma oturumu odak sesleri. Sesler telifsizdir: tarayıcıda saf JavaScript ile 10 dakikalık, ek yeri duyulmayan
// bir döngü olarak üretilir (soundSynth), WAV'a çevrilir ve tek bir <audio> öğesinde çalınır.
// <audio> kullanmamızın nedeni: telefon kilitlenince ya da uygulama arka plana geçince Web Audio susar,
// <audio> ise çalmaya devam eder ve kilit ekranında kontrol gösterilir. Yalnızca web'de çalışır.
import { Platform } from 'react-native';
import { synth, wavBlob, type SynthId } from './soundSynth';

export type SoundId = SynthId;
export type Rgb = readonly [number, number, number];
// tint: sayaç halkası ve sahne rengi
export const SOUNDS: readonly { id: SoundId; label: string; hint: string; tint: Rgb }[] = [
  { id: 'rain', label: 'Yağmur', hint: 'Cama vuran yumuşak yağmur', tint: [95, 224, 255] },
  { id: 'storm', label: 'Fırtına', hint: 'Sağanak, rüzgâr, uzaktan gök gürültüsü', tint: [150, 165, 255] },
  { id: 'fire', label: 'Şömine', hint: 'Sıcak uğultu ve yumuşak çıtırtılar', tint: [255, 168, 90] },
  { id: 'waves', label: 'Dalgalar', hint: 'Kıyıya vuran sakin deniz', tint: [0, 217, 192] },
  { id: 'deep', label: 'Derin odak', hint: 'Kahverengi gürültü, dikkati toplar', tint: [170, 140, 255] },
  { id: 'library', label: 'Kütüphane', hint: 'Sessiz salon, ara sıra sayfa sesi', tint: [243, 210, 122] },
];
export const SILENT = { label: 'Kapalı', hint: 'Sessizlikte oku', tint: [0, 229, 160] as Rgb };
export const soundLabel = (id: SoundId | null) => (id ? SOUNDS.find((s) => s.id === id)?.label ?? '' : SILENT.label);

export const SOUNDS_SUPPORTED = Platform.OS === 'web' && typeof window !== 'undefined' && typeof Audio !== 'undefined';

// ---------------------------------------------------------------- çalma
// Üretilen PCM'ler (her biri ~26 MB): bellek için yalnızca son iki ses tutulur
const rendered = new Map<SoundId, Promise<Int16Array | null>>();
let url: { key: string; href: string } | null = null;
let el: HTMLAudioElement | null = null;
let current: SoundId | null = null;
let volume = 0.6;
let volumeWorks: boolean | null = null; // iOS'ta audio.volume değiştirilemez: o zaman ses düzeyi dosyaya işlenir
let token = 0;

// Sessiz, kısa bir dosya: dokunuş anında öğeyi "açmak" için (iOS ancak dokunuşla çalmaya izin verir)
let silence: string | null = null;
const silentUrl = () => (silence ??= URL.createObjectURL(wavBlob(new Int16Array(5000))));

function audio(): HTMLAudioElement {
  if (!el) {
    el = new Audio(); el.loop = true; el.preload = 'auto';
    el.setAttribute('playsinline', ''); el.setAttribute('x-webkit-airplay', 'deny');
    // Döngü bir yerde takılırsa (bazı iOS sürümleri) baştan yeniden başlat
    el.addEventListener('ended', () => { if (current && el) { el.currentTime = 0; el.play().catch(() => undefined); } });
  }
  return el;
}

function pcmFor(id: SoundId) {
  let p = rendered.get(id);
  if (!p) {
    p = synth(id);
    rendered.set(id, p);
    p.catch(() => rendered.delete(id));
    while (rendered.size > 2) rendered.delete(rendered.keys().next().value as SoundId);
  }
  return p;
}

async function urlFor(id: SoundId, gain: number) {
  const key = `${id}:${gain.toFixed(1)}`;
  if (url?.key === key) return url.href;
  const pcm = await pcmFor(id);
  if (!pcm) throw new Error('ses üretilemedi');
  if (url?.key === key) return url.href;
  const old = url;
  url = { key, href: URL.createObjectURL(wavBlob(pcm, gain)) };
  // Eski dosyayı biraz sonra bırak (öğe hâlâ ona bağlı olabilir)
  if (old) setTimeout(() => URL.revokeObjectURL(old.href), 4000);
  return url.href;
}

function checkVolume(a: HTMLAudioElement) {
  if (volumeWorks !== null) return;
  try { a.volume = 0.5; volumeWorks = Math.abs(a.volume - 0.5) < 0.01; } catch { volumeWorks = false; }
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
