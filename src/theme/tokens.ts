// BOOKFLIX Tasarım Sistemi token'ları (tasarım sistemi artifact'ındaki tokens.json ile birebir).
// Tema: koyu (varsayılan), açık ve sepya. Seçim tarayıcıda saklanır ve uygulama açılırken uygulanır;
// değiştirmek için setTheme() sayfayı yeniden yükler (tüm ekranlar aynı renklerle yeniden çizilsin).
export type ThemeName = 'dark' | 'light' | 'sepia';
const THEME_KEY = 'bookflix.theme';

const shared = {
  danger: '#FF7A7A', imdb: '#E6B422', metalGold: '#F3D27A', metalSilver: '#CFD8D3', metalBronze: '#E0A877', chartFilm: '#2C7F8A',
};
const PALETTES: Record<ThemeName, Record<string, string>> = {
  dark: {
    bg: '#080B0A', surface: '#111916', surfaceSunken: '#0C1210', surfaceHover: '#18221E', border: '#1C2621', borderStrong: '#2A3A33',
    primary: '#00E5A0', accent: '#00D9C0', onPrimary: '#080B0A',
    text: '#F4F8F5', textSoft: '#B9C6C0', textMuted: '#8C9B94', textFaint: '#7A8A83',
    bgTranslucent: 'rgba(8,11,10,0.94)', scrim: 'rgba(0,0,0,0.6)',
  },
  light: {
    bg: '#F4F7F5', surface: '#FFFFFF', surfaceSunken: '#ECF1EE', surfaceHover: '#E5ECE8', border: '#DCE4E0', borderStrong: '#C5D1CB',
    primary: '#00A874', accent: '#00A396', onPrimary: '#FFFFFF',
    text: '#14201B', textSoft: '#3A4842', textMuted: '#5C6A64', textFaint: '#77847E',
    bgTranslucent: 'rgba(244,247,245,0.94)', scrim: 'rgba(20,32,27,0.35)',
  },
  sepia: {
    bg: '#F2E8D3', surface: '#FAF3E2', surfaceSunken: '#ECE1C8', surfaceHover: '#E7DBBF', border: '#DDCFB0', borderStrong: '#CBBB98',
    primary: '#2E7D5B', accent: '#2E7D72', onPrimary: '#FFF8EA',
    text: '#3A2E21', textSoft: '#5A4A37', textMuted: '#786852', textFaint: '#8D7D66',
    bgTranslucent: 'rgba(242,232,211,0.94)', scrim: 'rgba(58,46,33,0.35)',
  },
};

function readTheme(): ThemeName {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage?.getItem(THEME_KEY) : null;
    return v === 'light' || v === 'sepia' ? v : 'dark';
  } catch { return 'dark'; }
}
export const themeName: ThemeName = readTheme();
export const isDark = themeName === 'dark';
export function setTheme(t: ThemeName) {
  try { window.localStorage.setItem(THEME_KEY, t); } catch { /* gizli sekme */ }
  if (typeof window !== 'undefined') window.location.reload();
}

export const color = { ...shared, ...PALETTES[themeName] } as {
  bg: string; surface: string; surfaceSunken: string; surfaceHover: string; border: string; borderStrong: string;
  primary: string; accent: string; onPrimary: string; text: string; textSoft: string; textMuted: string; textFaint: string;
  bgTranslucent: string; scrim: string;
  danger: string; imdb: string; metalGold: string; metalSilver: string; metalBronze: string; chartFilm: string;
};

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 } as const;
export const radius = { xs: 6, sm: 10, md: 14, lg: 20, pill: 999 } as const;

export const font = {
  serif: 'Fraunces_600SemiBold',
  serifBold: 'Fraunces_700Bold',
  serifRegular: 'Fraunces_400Regular',
  serifItalic: 'Fraunces_400Regular_Italic',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  sansBlack: 'Inter_800ExtraBold',
} as const;

export const type = {
  displayXl: { fontFamily: font.serifBold, fontSize: 40, lineHeight: 42, letterSpacing: -0.8 },
  displayLg: { fontFamily: font.serifBold, fontSize: 32, lineHeight: 36, letterSpacing: -0.6 },
  titleLg: { fontFamily: font.serif, fontSize: 26, lineHeight: 32 },
  titleMd: { fontFamily: font.serif, fontSize: 21, lineHeight: 27 },
  titleSm: { fontFamily: font.serif, fontSize: 17, lineHeight: 22 },
  quoteLg: { fontFamily: font.serifRegular, fontSize: 22, lineHeight: 31 },
  quoteMd: { fontFamily: font.serifItalic, fontSize: 17, lineHeight: 25 },
  statXl: { fontFamily: font.sansBlack, fontSize: 44, lineHeight: 48, letterSpacing: -1.3, fontVariant: ['tabular-nums'] as const },
  statMd: { fontFamily: font.sansBlack, fontSize: 24, lineHeight: 28 },
  body: { fontFamily: font.sans, fontSize: 15, lineHeight: 24 },
  bodySm: { fontFamily: font.sans, fontSize: 14, lineHeight: 21 },
  label: { fontFamily: font.sansSemi, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: font.sansMedium, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: font.sansBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.9 },
  navLabel: { fontFamily: font.sansSemi, fontSize: 10, lineHeight: 12 },
} as const;

export const glow = {
  soft: { shadowColor: color.primary, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  strong: { shadowColor: color.primary, shadowOpacity: 0.55, shadowRadius: 26, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
} as const;

export const duration = { fast: 150, base: 250, slow: 400, counter: 1400 } as const;
