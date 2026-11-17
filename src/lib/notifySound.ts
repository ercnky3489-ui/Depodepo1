// BOOKFLIX bildirim sesi: hızlı bir sayfa çevirme hışırtısı ve ardından yumuşak, tok bir kitap kapağı sesi.
// Ses dosyası yoktur; Web Audio ile anlık üretilir. Tarayıcılar ses için önce bir dokunuş ister,
// bu yüzden ilk dokunuşta ses motoru hazırlanır; ondan önce gelen bildirimler sessiz gösterilir.
import { Platform } from 'react-native';

let ctx: AudioContext | null = null;
let lastPlay = 0;

export function primeNotifySound() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('AudioContext' in window)) return;
  const unlock = () => {
    try { ctx = ctx ?? new AudioContext(); void ctx.resume(); } catch { /* ses yok */ }
    window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
}

export function playNotifySound(volume = 0.5) {
  if (!ctx || ctx.state !== 'running') return;
  const now = Date.now();
  if (now - lastPlay < 900) return; // üst üste gelenlerde tek ses
  lastPlay = now;
  const c = ctx, t = c.currentTime;
  const out = c.createGain(); out.gain.value = volume; out.connect(c.destination);

  // 1) Sayfa çevirme: iki kısa, yükselen hışırtı
  [0, 0.09].forEach((d, i) => {
    const len = Math.floor(c.sampleRate * 0.16);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const ch = buf.getChannelData(0);
    for (let k = 0; k < len; k++) ch[k] = (Math.random() * 2 - 1) * Math.sin((Math.PI * k) / len);
    const n = c.createBufferSource(); n.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(1300 + i * 400, t + d); bp.frequency.exponentialRampToValueAtTime(4200 + i * 600, t + d + 0.14);
    const g = c.createGain(); g.gain.value = i ? 0.22 : 0.3;
    n.connect(bp); bp.connect(g); g.connect(out); n.start(t + d); n.stop(t + d + 0.17);
  });

  // 2) Kitap kapağı: yumuşak, ahşabımsı "tok"
  const at = t + 0.24;
  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(240, at); o.frequency.exponentialRampToValueAtTime(110, at + 0.16);
  const og = c.createGain(); og.gain.setValueAtTime(0, at); og.gain.linearRampToValueAtTime(0.55, at + 0.006); og.gain.exponentialRampToValueAtTime(0.001, at + 0.28);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  o.connect(lp); lp.connect(og); og.connect(out); o.start(at); o.stop(at + 0.3);
  // tok sese hafif bir "tık" (kapağın masaya değmesi)
  const len = Math.floor(c.sampleRate * 0.03);
  const cb = c.createBuffer(1, len, c.sampleRate);
  const cd = cb.getChannelData(0);
  for (let k = 0; k < len; k++) cd[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 4);
  const cn = c.createBufferSource(); cn.buffer = cb;
  const cf = c.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 1800; cf.Q.value = 0.8;
  const cg = c.createGain(); cg.gain.value = 0.25;
  cn.connect(cf); cf.connect(cg); cg.connect(out); cn.start(at); cn.stop(at + 0.04);
}
