// BOOKFLIX logosu: saat yönünde 90° yatırılmış bir "B" = gözlük.
// B'nin dik gövdesi üstte kaş çizgisi, iki kemeri altta iki yeşil cam; kemerlerin birleştiği yer köprü.
// Sol camda açık kitap, sağ camda oynat işareti: BOOKFLIX'te kitaplar ve filmler/diziler birlikte.
import { SvgXml } from 'react-native-svg';

export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 132">
  <defs>
    <linearGradient id="lens" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8CFFDD"/><stop offset="0.45" stop-color="#00E5A0"/><stop offset="1" stop-color="#009C6E"/>
    </linearGradient>
  </defs>
  <path d="M14 30 L4 48" stroke="#F4F8F5" stroke-width="9" stroke-linecap="round"/>
  <path d="M226 30 L236 48" stroke="#F4F8F5" stroke-width="9" stroke-linecap="round"/>
  <path class="logo-lens-l" d="M22 34 H115 V62 A46.5 46.5 0 0 1 68.5 108.5 A46.5 46.5 0 0 1 22 62 Z" fill="url(#lens)" stroke="#F4F8F5" stroke-width="10" stroke-linejoin="round"/>
  <path class="logo-lens-r" d="M125 34 H216 V58 A45.5 45.5 0 0 1 170.5 103.5 A45.5 45.5 0 0 1 125 58 Z" fill="url(#lens)" stroke="#F4F8F5" stroke-width="10" stroke-linejoin="round"/>
  <rect x="10" y="20" width="220" height="18" rx="9" fill="#F4F8F5"/>
  <!-- sol camda kitap, sağ camda oynat: kitaplar ve filmler/diziler -->
  <path class="logo-book" d="M68 56 c-8 -5 -18 -5 -24 -2 v26 c6 -3 16 -3 24 2 z M68 56 c8 -5 18 -5 24 -2 v26 c-6 -3 -16 -3 -24 2 z" fill="#06120E" fill-opacity="0.85"/>
  <path class="logo-play" d="M160 52.5 Q160 49 163 50.8 L186 65.4 Q189 68 186 70.6 L163 85.2 Q160 87 160 83.5 Z" fill="#06120E" fill-opacity="0.85"/>
</svg>`;

export function LogoMark({ width = 120 }: { width?: number }) {
  return <SvgXml xml={LOGO_SVG} width={width} height={(width * 132) / 240} accessibilityLabel="BOOKFLIX logosu" />;
}
