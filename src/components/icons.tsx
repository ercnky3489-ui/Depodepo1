// Tek tip çizgi ikonlar (24 ızgara, 1,8 çizgi). Dolu hâl yalnızca durum bildirir.
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { color } from '../theme/tokens';

type P = { size?: number; c?: string; fill?: string; sw?: number };
const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24' });

export const IconHeart = ({ size = 20, c = color.textMuted, fill = 'none' }: P) => (
  <Svg {...base(size)} fill={fill} stroke={c} strokeWidth={1.8} strokeLinejoin="round"><Path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" /></Svg>
);
export const IconComment = ({ size = 20, c = color.textMuted }: P) => (
  <Svg {...base(size)} fill="none" stroke={c} strokeWidth={1.8} strokeLinejoin="round"><Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></Svg>
);
export const IconBookmark = ({ size = 20, c = color.textMuted, fill = 'none' }: P) => (
  <Svg {...base(size)} fill={fill} stroke={c} strokeWidth={1.8} strokeLinejoin="round"><Path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></Svg>
);
export const IconShare = ({ size = 20, c = color.textMuted }: P) => (
  <Svg {...base(size)} fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><Path d="M16 6l-4-4-4 4" /><Path d="M12 2v13" /></Svg>
);
export const IconThumb = ({ size = 20, c = color.textMuted }: P) => (
  <Svg {...base(size)} fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Path d="M7 10v11H3V10z" /><Path d="M7 10l4-8a3 3 0 0 1 3 3v4h6a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.6 21H7" /></Svg>
);
export const IconSearch = ({ size = 22, c = color.text }: P) => (
  <Svg {...base(size)} fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round"><Circle cx={11} cy={11} r={7} /><Path d="M20 20l-3.5-3.5" /></Svg>
);
export const IconBell = ({ size = 22, c = color.text, fill = 'none' }: P) => (
  <Svg {...base(size)} fill={fill} stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Svg>
);
export const IconHome = ({ size = 24, c = color.textMuted, fill = 'none' }: P) => (
  <Svg {...base(size)} fill={fill} stroke={c} strokeWidth={1.8} strokeLinejoin="round"><Path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Svg>
);
export const IconCompass = ({ size = 24, c = color.textMuted, fill = 'none' }: P) => (
  <Svg {...base(size)} fill={fill} stroke={c} strokeWidth={1.8} strokeLinejoin="round"><Circle cx={12} cy={12} r={9} /><Path d="M15.5 8.5l-2 5-5 2 2-5z" /></Svg>
);
export const IconUser = ({ size = 24, c = color.textMuted, fill = 'none' }: P) => (
  <Svg {...base(size)} fill={fill} stroke={c} strokeWidth={1.8} strokeLinecap="round"><Circle cx={12} cy={8} r={4} /><Path d="M4 21a8 8 0 0 1 16 0" /></Svg>
);
export const IconPlus = ({ size = 26, c = color.onPrimary }: P) => (
  <Svg {...base(size)} fill="none" stroke={c} strokeWidth={2.4} strokeLinecap="round"><Path d="M12 5v14M5 12h14" /></Svg>
);
export const IconBack = ({ size = 22, c = color.text }: P) => (
  <Svg {...base(size)} fill="none" stroke={c} strokeWidth={2} strokeLinecap="round"><Path d="M15 6l-6 6 6 6" /></Svg>
);
export const IconCheck = ({ size = 16, c = color.onPrimary, sw = 3 }: P) => (
  <Svg {...base(size)} fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><Path d="M20 6L9 17l-5-5" /></Svg>
);
export const IconEye = ({ size = 18, c = color.accent }: P) => (
  <Svg {...base(size)} fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round"><Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><Circle cx={12} cy={12} r={3} /></Svg>
);
export const IconStar = ({ size = 14, c = color.primary, fill = color.primary }: P) => (
  <Svg {...base(size)} fill={fill} stroke={c} strokeWidth={1} strokeLinejoin="round"><Path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z" /></Svg>
);
export const IconFilm = ({ size = 20, c = color.accent }: P) => (
  <Svg {...base(size)} fill="none" stroke={c} strokeWidth={1.8} strokeLinejoin="round"><Rect x={3} y={5} width={18} height={14} rx={2} /><Path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4" /></Svg>
);
export const IconMore = ({ size = 20, c = color.textMuted }: P) => (
  <Svg {...base(size)} fill={c}><Circle cx={5} cy={12} r={1.8} /><Circle cx={12} cy={12} r={1.8} /><Circle cx={19} cy={12} r={1.8} /></Svg>
);
export const IconEdit = ({ size = 21, c = color.text }: P) => (
  <Svg {...base(size)} fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 20h9" /><Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Svg>
);
export const IconSettings = ({ size = 21, c = color.text }: P) => (
  <Svg {...base(size)} fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round"><Circle cx={12} cy={12} r={3} /><Path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></Svg>
);
