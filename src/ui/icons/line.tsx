import { Text as RNText, type TextStyle } from 'react-native';

export type IconName = 'cup' | 'book' | 'flask' | 'wrench';

const GLYPH: Record<IconName, string> = {
  cup: '☕',
  book: '📚',
  flask: '⚗️',
  wrench: '🔧',
};

export function Icon({ name, color, size = 18 }: { name: IconName; color?: string; size?: number }) {
  const style: TextStyle = { fontSize: size };
  if (color) style.color = color;
  return <RNText style={style}>{GLYPH[name]}</RNText>;
}
