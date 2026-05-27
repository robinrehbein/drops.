import { View } from 'react-native';

import { useTheme } from '@/ui/theme/useTheme';

export function ProgressBar({ progress }: { progress: number }) {
  const t = useTheme();
  const widthPct = `${Math.max(0, Math.min(1, progress)) * 100}%` as const;
  return (
    <View
      style={{
        height: 8,
        borderRadius: t.radii.pill,
        backgroundColor: t.colors.paperEdge,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          height: '100%',
          width: widthPct,
          backgroundColor: progress >= 0.9 ? t.colors.danger : t.colors.forest,
        }}
      />
    </View>
  );
}
