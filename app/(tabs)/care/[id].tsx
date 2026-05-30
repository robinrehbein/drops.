import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, TouchableOpacity, View } from 'react-native';

import { useTasksWithStatus } from '@/features/maintenance/hooks';
import { useMachine } from '@/features/machines/hooks';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { Header } from '@/ui/primitives/Header';
import { Pill } from '@/ui/primitives/Pill';
import { ReadinessRow } from '@/ui/primitives/ReadinessRow';
import { Surface } from '@/ui/primitives/Surface';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';
import type { TaskWithStatus } from '@/features/maintenance/types';

function TaskRow({ task, machineId }: { task: TaskWithStatus; machineId: string }) {
  const router = useRouter();
  const t = useTheme();

  const cadenceText = `Every ${task.cadenceValue} ${task.cadenceKind.replace('every_n_', '')}`;
  const lastText = task.lastDoneAt
    ? `Last: ${task.lastDoneAt.toLocaleDateString()}`
    : 'Never done';

  return (
    <Surface bg="paperDeep" padding="md" radius="md" bordered style={{ gap: t.space.xs }}>
      <Text variant="bodyStrong">{task.label}</Text>
      <Text variant="caption" color={t.colors.inkSoft}>{cadenceText} · {lastText}</Text>
      <ReadinessRow label="Next" status={task.nextDue} />
      <Pill
        label="Mark done now"
        variant="ghost"
        onPress={() =>
          router.push({
            pathname: '/(modals)/log-task',
            params: { taskId: task.id, machineId, label: task.label, cadenceKind: task.cadenceKind },
          } as never)
        }
      />
    </Surface>
  );
}

export default function MachineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const { data: machine } = useMachine(id ?? null);
  const { data: tasks = [] } = useTasksWithStatus(id ?? null);

  if (!machine) return null;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header
        title={machine.name}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
        <Text variant="caption" color={t.colors.inkSoft}>
          {machine.kind.replace('_', ' ')} {machine.model ? `· ${machine.model}` : ''}
        </Text>

        {tasks.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            body="Add maintenance tasks to track when things need doing."
            cta={{
              label: '+ Add task',
              onPress: () => router.push({ pathname: '/(tabs)/care/add-task', params: { machineId: id } } as never),
            }}
          />
        ) : (
          <>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} machineId={id ?? ''} />
            ))}
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/care/add-task', params: { machineId: id } } as never)}
              accessibilityRole="button"
              accessibilityLabel="Add task"
            >
              <Surface bg="paperDeep" padding="md" radius="md" bordered>
                <Text variant="bodyStrong" color={t.colors.forest}>+ Add task</Text>
              </Surface>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}
