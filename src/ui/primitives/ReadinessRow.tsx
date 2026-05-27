import { View } from 'react-native';

import type { NextDue } from '@/domain/maintenance';
import { useTheme } from '@/ui/theme/useTheme';
import { Text } from './Text';

function formatRemaining(due: NextDue): string {
  if (due.status === 'overdue') {
    const n = Math.abs(due.remaining);
    return `Overdue ${n} ${due.unit}`;
  }
  if (due.status === 'due_soon') return `Due in ${due.remaining} ${due.unit}`;
  return `${due.remaining} ${due.unit} left`;
}

export function ReadinessRow({ label, status }: { label: string; status: NextDue }) {
  const t = useTheme();
  const valueColor =
    status.status === 'overdue'
      ? t.colors.danger
      : status.status === 'due_soon'
        ? t.colors.amber
        : t.colors.inkSoft;

  return (
    <View
      style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: t.space.xs }}
      testID="readiness-row"
    >
      <Text variant="label" color={t.colors.inkSoft}>
        {label.toUpperCase()}
      </Text>
      <Text variant="caption" color={valueColor} testID="readiness-value">
        {formatRemaining(status)}
      </Text>
    </View>
  );
}
