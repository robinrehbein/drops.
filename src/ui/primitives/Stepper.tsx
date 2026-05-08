import { Pressable, View } from 'react-native';

import { useTheme } from '@/ui/theme/useTheme';
import { Text } from './Text';

export type StepperProps = {
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (next: number) => void;
};

const round = (n: number, decimals = 1) =>
  Math.round(n * 10 ** decimals) / 10 ** decimals;

export function Stepper({ label, unit, min, max, step, value, onChange }: StepperProps) {
  const t = useTheme();
  const decrement = () => {
    const next = round(value - step);
    if (next >= min) onChange(next);
  };
  const increment = () => {
    const next = round(value + step);
    if (next <= max) onChange(next);
  };
  return (
    <View>
      <Text variant="label">{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: t.space.xs }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} decrease`}
          onPress={decrement}
          style={{
            width: 40, height: 40, borderRadius: t.radii.pill,
            backgroundColor: t.colors.paperDeep,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text variant="bodyStrong">−</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="numeral">
            {value.toFixed(1)} {unit ?? ''}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} increase`}
          onPress={increment}
          style={{
            width: 40, height: 40, borderRadius: t.radii.pill,
            backgroundColor: t.colors.paperDeep,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text variant="bodyStrong">+</Text>
        </Pressable>
      </View>
    </View>
  );
}
