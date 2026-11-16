// Süren okuma oturumu: ekrandan bağımsız, uygulama genelinde tek kayıt.
// Ekran kapansa, başka sekmeye geçilse ya da sayfa yenilense de sürer (tarayıcıda saklanır).
// Kilit ekranında kitap adı ve oynat/duraklat kontrolü gösterilir (Media Session).
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { imageUrl } from '../../lib/images';
import { pauseSound, playSound, resumeSound, SILENT, soundLabel, SOUNDS, stopSound, type SoundId } from './focusSounds';
import { bookArt } from './lockArt';

export type ActiveSession = {
  mediaId: string;
  title: string;
  author: string | null;
  coverPath: string | null;
  accMs: number;          // duraklatmalara kadar biriken süre
  since: number | null;   // çalışıyorsa başlama anı (ms)
  startPage: number;
  page: number;
  sound: SoundId | null;
  soundLoading?: boolean; // ses hazırlanıyor (ilk seçimde 1-2 sn)
};

const KEY = 'bookflix.activeSession';
const web = Platform.OS === 'web' && typeof window !== 'undefined';
let state: ActiveSession | null = load();
const subs = new Set<() => void>();

function load(): ActiveSession | null {
  if (!web) return null;
  try {
    const raw = window.localStorage.getItem(KEY); if (!raw) return null;
    // Sayfa yeniden açıldıysa ses kendiliğinden çalamaz (dokunuş gerekir); seçimi sıfırla
    return { ...(JSON.parse(raw) as ActiveSession), sound: null, soundLoading: false };
  } catch { return null; }
}
function persist() {
  if (!web) return;
  try { if (state) window.localStorage.setItem(KEY, JSON.stringify(state)); else window.localStorage.removeItem(KEY); } catch { /* gizli sekme */ }
}
function set(next: ActiveSession | null) {
  state = next; persist(); syncMediaSession(); subs.forEach((f) => f());
}

export const getSession = () => state;
export const elapsedMs = (s: ActiveSession, now = Date.now()) => s.accMs + (s.since ? now - s.since : 0);
export const isRunning = (s: ActiveSession | null) => !!s?.since;

export function useActiveSession() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => null);
}

export function startSession(meta: { mediaId: string; title: string; author: string | null; coverPath: string | null; page: number }) {
  stopSound(true);
  set({ ...meta, accMs: 0, since: Date.now(), startPage: meta.page, page: meta.page, sound: null });
}

export function pauseSession() {
  const s = state; if (!s || !s.since) return;
  pauseSound();
  set({ ...s, accMs: elapsedMs(s), since: null });
}

/** Dokunuşla çağrılmalı: seçili ses de yeniden çalar. */
export function resumeSession() {
  const s = state; if (!s || s.since) return;
  set({ ...s, since: Date.now() });
  if (s.sound) {
    set({ ...state!, soundLoading: true });
    resumeSound().finally(() => { if (state) set({ ...state, soundLoading: false }); });
  }
}

export const toggleSession = () => (isRunning(state) ? pauseSession() : resumeSession());

export function setSessionPage(page: number) {
  const s = state; if (!s || s.page === page) return;
  set({ ...s, page });
}

/** Dokunuşla çağrılmalı (iOS ses izni). Duraklatılmışsa ses oturum sürünce başlar. */
export function setSessionSound(sound: SoundId | null) {
  const s = state; if (!s) return;
  if (!sound) { stopSound(); set({ ...s, sound, soundLoading: false }); return; }
  set({ ...s, sound, soundLoading: !!s.since });
  if (s.since) playSound(sound).finally(() => { if (state && state.sound === sound) set({ ...state, soundLoading: false }); });
}

/** Süreyi dondurup oturumu kaydetmeye hazırlar; saniyeyi döndürür. */
export function freezeSession(): number {
  const s = state; if (!s) return 0;
  if (s.since) set({ ...s, accMs: elapsedMs(s), since: null });
  pauseSound();
  return Math.floor((state?.accMs ?? 0) / 1000);
}

export function endSession() {
  stopSound();
  set(null);
}

// ---------------------------------------------------------------- kilit ekranı
let handlersSet = false;
let artFor: string | null = null;
function syncMediaSession() {
  if (!web || !('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  const s = state;
  if (!handlersSet) {
    handlersSet = true;
    const on = (a: MediaSessionAction, fn: (() => void) | null) => { try { ms.setActionHandler(a, fn); } catch { /* desteklenmiyor */ } };
    on('play', () => resumeSession());
    on('pause', () => pauseSession());
    on('stop', () => pauseSession());
    // İleri/geri sarma bir odak sesinde anlamsız: kilit ekranında gösterme
    on('seekbackward', null); on('seekforward', null); on('seekto', null);
  }
  if (!s || !s.sound) { ms.metadata = null; ms.playbackState = 'none'; artFor = null; return; }
  const cover = s.coverPath ? imageUrl(s.coverPath) : null;
  const meta = (artwork: MediaImage[]) => new MediaMetadata({ title: s.title, artist: `Okuma oturumu · ${soundLabel(s.sound)}`, album: 'BOOKFLIX', artwork });
  const key = `${s.mediaId}:${s.sound}`;
  if (artFor !== key) {
    artFor = key;
    // Önce simge, 3B kitap görseli hazır olunca (1 sn'den kısa) onunla değiştir
    const logo = new URL('icons/icon-512-v3.png', document.baseURI).href;
    ms.metadata = meta([{ src: logo, sizes: '512x512', type: 'image/png' }]);
    const tint = SOUNDS.find((q) => q.id === s.sound)?.tint ?? SILENT.tint;
    bookArt({ key, cover, title: s.title, author: s.author, tint })
      .then((u) => { if (u && artFor === key && state) ms.metadata = meta([{ src: u, sizes: '512x512', type: 'image/png' }]); });
  }
  ms.playbackState = s.since ? 'playing' : 'paused';
  // Kilit ekranındaki çubuk: 25 dakikalık odak turunda neredeyiz
  try {
    const ROUND = 25 * 60, el = elapsedMs(s) / 1000;
    ms.setPositionState({ duration: ROUND, position: el % ROUND, playbackRate: 1 });
  } catch { /* desteklenmiyor */ }
}
