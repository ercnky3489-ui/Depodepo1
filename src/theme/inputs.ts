import { color, radius, space } from './tokens';

export const inputStyle = {
  height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface,
  paddingHorizontal: space[4], color: color.text, fontFamily: 'Inter_500Medium', fontSize: 16,
} as const;
