import { useRouter } from 'expo-router';
import { ScrollView, TouchableOpacity, View } from 'react-native';

import { useMachines } from '@/features/machines/hooks';
import { useTasksWithStatus } from '@/features/maintenance/hooks';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { Header } from '@/ui/primitives/Header';
import { MachineCard } from '@/ui/primitives/MachineCard';
import { Surface } from '@/ui/primitives/Surface';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

function MachineRow({ id }: { id: string }) {
  const router = useRouter();
  const { data: allMachines } = useMachines();
  const machine = allMachines?.find((m) => m.id === id);
  const { data: tasks = [] } = useTasksWithStatus(id);
  if (!machine) return null;
  return (
    <MachineCard
      machine={machine}
      tasks={tasks}
      onPress={() => router.push({ pathname: '/(tabs)/care/[id]', params: { id } } as never)}
    />
  );
}

export default function CareScreen() {
  const router = useRouter();
  const t = useTheme();
  const { data: machines = [], isLoading } = useMachines();

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header title="Care" />
      {isLoading ? null : machines.length === 0 ? (
        <EmptyState
          title="No machines yet"
          body="Add your espresso machine to start tracking maintenance."
          cta={{ label: '+ Add machine', onPress: () => router.push('/(tabs)/care/new' as never) }}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
          {machines.map((m) => (
            <MachineRow key={m.id} id={m.id} />
          ))}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/care/new' as never)}
            style={{ marginTop: t.space.sm }}
            accessibilityRole="button"
            accessibilityLabel="Add machine"
          >
            <Surface bg="paperDeep" padding="md" radius="md" bordered>
              <Text variant="bodyStrong" color={t.colors.forest}>+ Add machine</Text>
            </Surface>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}
