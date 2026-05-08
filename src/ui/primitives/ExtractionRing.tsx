import { Canvas, Circle, Path, Skia, Group } from '@shopify/react-native-skia';

import { useTheme } from '@/ui/theme/useTheme';
import { Text } from './Text';
import { View } from 'react-native';

export type ExtractionRingProps = {
  size?: number;
  /** Progress 0..1 */
  progress: number;
  /** Center label, e.g. "66%". */
  centerLabel: string;
  /** Tiny under-label, e.g. "EXTRACTION". */
  caption: string;
};

export function ExtractionRing({ size = 200, progress, centerLabel, caption }: ExtractionRingProps) {
  const t = useTheme();
  const stroke = 6;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dashArc = Math.max(0, Math.min(1, progress)) * circ;

  const arc = Skia.Path.Make();
  arc.addCircle(cx, cy, r);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Canvas style={{ width: size, height: size, position: 'absolute' }}>
        <Circle cx={cx} cy={cy} r={r} color={t.colors.paperEdge} style="stroke" strokeWidth={stroke} />
        <Group transform={[{ rotate: -Math.PI / 2 }]} origin={{ x: cx, y: cy }}>
          <Path
            path={arc}
            color={t.colors.forest}
            style="stroke"
            strokeWidth={stroke}
            strokeCap="round"
            start={0}
            end={dashArc / circ}
          />
        </Group>
      </Canvas>
      <Text variant="title">{centerLabel}</Text>
      <Text variant="label" style={{ marginTop: 4 }}>{caption}</Text>
    </View>
  );
}
