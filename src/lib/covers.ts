// Profil kapağı kaynakları:
//   null                    → varsayılan palet
//   "preset:<anahtar>"      → hazır palet ya da hazır görsel (COVER_PRESETS)
//   "storage:user-covers/…" → kullanıcının yüklediği fotoğraf
import { imageUrl } from './images';

export interface CoverPreset {
  key: string;
  label: string;
  colors: readonly [string, string, string];
  image?: string; // public/covers altındaki dosya adı (alt yol eklenerek çözülür)
}

// Tablolar Wikimedia Commons'tan, kamu malı (ressamlar 500 yıl önce öldü; PD-Art).
export const COVER_PRESETS: readonly CoverPreset[] = [
  { key: 'monalisa', label: 'Mona Lisa', colors: ['#1B2416', '#3A4A2A', '#C9B27A'], image: 'monalisa.jpg' },
  { key: 'venus', label: "Venüs'ün Doğuşu", colors: ['#10302E', '#3B6E6A', '#E9D8B8'], image: 'venus.jpg' },
  { key: 'primavera', label: 'Bahar', colors: ['#0D1A10', '#26402A', '#E2B8A0'], image: 'primavera.jpg' },
  { key: 'adem', label: "Adem'in Yaratılışı", colors: ['#2A2018', '#6E5A44', '#E6D2B0'], image: 'adem.jpg' },
  { key: 'gece', label: 'Gece', colors: ['#071A1C', '#0E3B3A', '#00E5A0'] },
  { key: 'altin', label: 'Altın', colors: ['#2A1A05', '#5A3E12', '#F3D27A'] },
  { key: 'mor', label: 'Mor', colors: ['#1E0F2E', '#3B2340', '#B07CC6'] },
  { key: 'mavi', label: 'Mavi', colors: ['#0B1020', '#1B2A4A', '#5FA8FF'] },
];

const DEFAULT_COLORS = ['#0C1210', '#18221E', '#00E5A0'] as const;
export const DEFAULT_PRESET = 'monalisa';

export type ResolvedCover =
  | { kind: 'image'; uri: string }
  | { kind: 'gradient'; colors: readonly [string, string, string] };

export function resolveCover(path: string | null | undefined): ResolvedCover {
  if (path?.startsWith('preset:')) {
    const key = path.slice('preset:'.length);
    const preset = COVER_PRESETS.find((p) => p.key === key);
    if (preset?.image) {
      const base = process.env.EXPO_PUBLIC_BASE_URL ?? '';
      return { kind: 'image', uri: `${base}/covers/${preset.image}` };
    }
    if (preset) return { kind: 'gradient', colors: preset.colors };
  }
  const uri = imageUrl(path);
  if (uri) return { kind: 'image', uri };
  // Kapak seçilmemişse varsayılan tablo
  return resolveCover(`preset:${DEFAULT_PRESET}`) ?? { kind: 'gradient', colors: DEFAULT_COLORS };
}
