import {
  ArrowLeft,
  ArrowRight,
  Bean,
  BookOpen,
  Check,
  Coffee,
  FlaskConical,
  type LucideProps,
  MapPin,
  Star,
  TrendingDown,
  TrendingUp,
  Wrench,
  X,
} from 'lucide-react-native';
import type { ComponentType } from 'react';
import { View } from 'react-native';

export type IconName =
  | 'cup'
  | 'book'
  | 'flask'
  | 'wrench'
  | 'pin'
  | 'bean'
  | 'star'
  | 'check'
  | 'close'
  | 'arrowLeft'
  | 'arrowRight'
  | 'trendUp'
  | 'trendDown';

const MAP: Record<IconName, ComponentType<LucideProps>> = {
  cup: Coffee,
  book: BookOpen,
  flask: FlaskConical,
  wrench: Wrench,
  pin: MapPin,
  bean: Bean,
  star: Star,
  check: Check,
  close: X,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  trendUp: TrendingUp,
  trendDown: TrendingDown,
};

export function Icon({
  name,
  color,
  size = 18,
  fill = 'none',
  strokeWidth = 2,
}: {
  name: IconName;
  color?: string;
  size?: number;
  fill?: string;
  strokeWidth?: number;
}) {
  const Glyph = MAP[name];
  return (
    <View testID={`icon-${name}`} accessibilityLabel={name} accessibilityRole="image">
      <Glyph
        {...(color !== undefined ? { color } : {})}
        size={size}
        fill={fill}
        strokeWidth={strokeWidth}
      />
    </View>
  );
}
