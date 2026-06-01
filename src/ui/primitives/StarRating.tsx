import { View } from 'react-native';

import { Icon } from '@/ui/icons/line';
import { useTheme } from '@/ui/theme/useTheme';

/**
 * Read-only star rating: renders `value` filled star icons in a row (the SVG
 * replacement for `'★'.repeat(value)`). Not interactive — see RatingStars for input.
 */
export function StarRating({
  value,
  size = 16,
  color,
}: {
  value: number;
  size?: number;
  color?: string;
}) {
  const t = useTheme();
  const fillColor = color ?? t.colors.forest;
  const count = Math.max(0, Math.round(value));
  if (count === 0) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {Array.from({ length: count }, (_, i) => (
        <Icon key={i} name="star" size={size} color={fillColor} fill={fillColor} />
      ))}
    </View>
  );
}
