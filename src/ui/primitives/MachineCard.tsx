import { TouchableOpacity, View } from 'react-native';

import type { MachineRow } from '@/features/machines/types';
import type { TaskWithStatus } from '@/features/maintenance/types';
import { useTheme } from '@/ui/theme/useTheme';
import { Surface } from './Surface';
import { Text } from './Text';
import { ReadinessRow } from './ReadinessRow';

const KIND_LABEL: Record<string, string> = {
  espresso_machine: 'Espresso machine',
  grinder: 'Grinder',
  kettle: 'Kettle',
  other: 'Equipment',
};

const IMMINENT_PRIORITY: Record<string, number> = { overdue: 0, due_soon: 1, ok: 2 };

export function MachineCard({
  machine,
  tasks,
  onPress,
}: {
  machine: MachineRow;
  tasks: TaskWithStatus[];
  onPress?: () => void;
}) {
  const t = useTheme();

  const topTasks = [...tasks]
    .sort((a, b) => (IMMINENT_PRIORITY[a.nextDue.status] ?? 2) - (IMMINENT_PRIORITY[b.nextDue.status] ?? 2))
    .slice(0, 3);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} testID="machine-card">
      <Surface bg="paperDeep" padding="md" radius="md" bordered>
        <Text variant="heading">{machine.name}</Text>
        <Text variant="caption" color={t.colors.inkSoft}>
          {KIND_LABEL[machine.kind] ?? machine.kind}
        </Text>
        {topTasks.length > 0 ? (
          <View style={{ marginTop: t.space.sm }}>
            {topTasks.map((task) => (
              <ReadinessRow key={task.id} label={task.label} status={task.nextDue} />
            ))}
          </View>
        ) : (
          <Text variant="caption" color={t.colors.inkFaint} style={{ marginTop: t.space.sm }}>
            No maintenance tasks yet
          </Text>
        )}
      </Surface>
    </TouchableOpacity>
  );
}
