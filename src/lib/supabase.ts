import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

const extra = Constants.expoConfig?.extra ?? {};
const rawUrl = extra.supabaseUrl as string | undefined;
// Web önizlemesinde API aynı adresten (ör. /sb) sunulur; göreli adres sayfanın kökenine eklenir.
const url = rawUrl?.startsWith('/') && Platform.OS === 'web' && typeof window !== 'undefined'
  ? window.location.origin + rawUrl
  : rawUrl;
const anonKey = extra.supabaseAnonKey as string | undefined;

if (!url || !anonKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY tanımlanmalı (.env.example).');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web'de e-postadaki giriş bağlantısı siteye ?code= ile döner; oturum adresten alınır.
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

// Uygulama ön plandayken oturum yenilenir, arka plandayken durur (Supabase RN önerisi).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export const IMDB_ENABLED = extra.imdbEnabled === true;
export const KVKK_VERSION = (extra.kvkkVersion as string) ?? 'kvkk-2026-11';

// Sunucu hatalarının kullanıcıya gösterilecek Türkçe karşılığı (tetikleyicilerin hint alanı)
export function errorMessage(e: unknown): string {
  const err = e as { hint?: string; message?: string; code?: string } | null;
  if (err?.hint) return err.hint;
  switch (err?.message) {
    case 'rate_limited': return 'Çok hızlı paylaşım yapıyorsun, birkaç dakika sonra tekrar dene.';
    case 'blocked': return 'Bu kullanıcıyla etkileşim kuramazsın.';
    case 'target_not_found': return 'Bu içerik artık görünmüyor.';
    case 'own_review': return 'Kendi incelemeni faydalı olarak işaretleyemezsin.';
    default: return 'Bir şeyler ters gitti. Lütfen tekrar dene.';
  }
}
