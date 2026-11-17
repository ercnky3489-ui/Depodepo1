// Web Push: uygulama kapalıyken telefona/bilgisayara bildirim. Servis çalışanı (public/sw.js) bildirimi gösterir.
// Sunucu tarafında VAPID anahtarları ayarlanmadıysa (EXPO_PUBLIC_VAPID_PUBLIC_KEY yoksa) hiçbir şey gösterilmez.
import { Platform } from 'react-native';
import { supabase } from './supabase';

const BASE = process.env.EXPO_PUBLIC_BASE_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const web = Platform.OS === 'web' && typeof window !== 'undefined';

export type PushState = 'unconfigured' | 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

export function registerServiceWorker() {
  if (!web || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch(() => undefined);
}

const isIos = () => web && /iPhone|iPad|iPod/.test(navigator.userAgent);
const standalone = () => web && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

export async function pushState(): Promise<PushState> {
  if (!web || !KEY) return 'unconfigured';
  if (isIos() && !standalone()) return 'needs-install'; // iPhone'da yalnızca ana ekrana eklenen uygulama bildirim alabilir
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration(`${BASE}/`);
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

function keyBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Dokunuşla çağrılmalı: izin ister, aboneliği oluşturup sunucuya kaydeder. */
export async function enablePush(userId: string): Promise<PushState> {
  if (!web || !KEY) return 'unconfigured';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
  registerServiceWorker();
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await supabase.from('web_push_subscriptions').upsert(
    { user_id: userId, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 200) },
    { onConflict: 'endpoint' });
  if (error) throw error;
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  if (!web) return 'unconfigured';
  const reg = await navigator.serviceWorker.getRegistration(`${BASE}/`);
  const sub = await reg?.pushManager.getSubscription();
  if (sub) { await supabase.from('web_push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
  return 'off';
}
