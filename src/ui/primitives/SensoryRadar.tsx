import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { View } from 'react-native';

import type { TastingAxes } from '@/domain/tasting';
import { useTheme } from '@/ui/theme/useTheme';
import { Text } from './Text';

const AXES = [
  { key: 'mouthfeel' as const, label: 'FEEL' },
  { key: 'acidity' as const, label: 'ACID' },
  { key: 'sweetness' as const, label: 'SWEET' },
  { key: 'bitterness' as const, label: 'BITTER' },
  { key: 'balance' as const, label: 'BALANCE' },
];
const N = AXES.length;
const MAX_VAL = 5;

function polarToXY(angle: number, radius: number, cx: number, cy: number) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

export function SensoryRadar({ axes }: { axes: TastingAxes }) {
  const t = useTheme();
  const SIZE = 160;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const maxR = SIZE / 2 - 20;
  const allZero = Object.values(axes).every((v) => v === 0);

  const angleStep = (2 * Math.PI) / N;
  const startAngle = -Math.PI / 2;

  const path = Skia.Path.Make();
  AXES.forEach(({ key }, i) => {
    const ratio = Math.min(1, Math.max(0, (axes[key] ?? 0) / MAX_VAL));
    const angle = startAngle + i * angleStep;
    const { x, y } = polarToXY(angle, ratio * maxR, cx, cy);
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
  path.close();

  const gridPath = Skia.Path.Make();
  [0.25, 0.5, 0.75, 1].forEach((level) => {
    AXES.forEach(({ }, i) => {
      const angle = startAngle + i * angleStep;
      const { x, y } = polarToXY(angle, level * maxR, cx, cy);
      if (i === 0) gridPath.moveTo(x, y);
      else gridPath.lineTo(x, y);
    });
    gridPath.close();
  });

  return (
    <View>
      <View style={{ width: SIZE, height: SIZE }}>
        <Canvas style={{ width: SIZE, height: SIZE, position: 'absolute' }}>
          <Path path={gridPath} color={t.colors.paperEdge} style="stroke" strokeWidth={1} />
          {!allZero && (
            <Path path={path} color={t.colors.forestPale} style="fill" opacity={0.7} />
          )}
          {!allZero && (
            <Path path={path} color={t.colors.forest} style="stroke" strokeWidth={2} />
          )}
        </Canvas>
        {/* Axis labels */}
        {AXES.map(({ label }, i) => {
          const angle = startAngle + i * angleStep;
          const { x, y } = polarToXY(angle, maxR + 12, cx, cy);
          return (
            <View
              key={label}
              style={{ position: 'absolute', left: x - 20, top: y - 8, width: 40 }}
            >
              <Text
                variant="label"
                color={t.colors.inkSoft}
                testID={`radar-label-${label}`}
                style={{ textAlign: 'center', fontSize: 8 }}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
