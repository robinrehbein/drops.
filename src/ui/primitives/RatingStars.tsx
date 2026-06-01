import { Pressable, View } from 'react-native';

import { AnimatedIcon } from '@/ui/icons/AnimatedIcon';
import { useTheme } from '@/ui/theme/useTheme';

export function RatingStars({
  value,
  onChange,
}: {
  value: number | null;
  onChange?: (next: number) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: t.space.xs }} accessibilityRole="adjustable">
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = (value ?? 0) >= n;
        return (
          <Pressable
            key={n}
            onPress={() => onChange?.(n)}
            disabled={!onChange}
            testID={`star-${n}`}
          >
            <AnimatedIcon
              name="star"
              animation="pop"
              trigger={selected}
              size={28}
              color={selected ? t.colors.forest : t.colors.inkFaint}
              fill={selected ? t.colors.forest : 'none'}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
