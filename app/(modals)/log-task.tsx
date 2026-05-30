import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { useLogTask, useMaintenanceSnapshot } from '@/features/maintenance/hooks';
import { useSnackbarStore } from '@/state/snackbar';
import { Header } from '@/ui/primitives/Header';
import { Pill } from '@/ui/primitives/Pill';
import { Surface } from '@/ui/primitives/Surface';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

function snapshotLabel(cadenceKind: string | undefined, shots?: number, liters?: number) {
  if (cadenceKind === 'every_n_shots') return `At shot count: ${shots ?? '...'}`;
  if (cadenceKind === 'every_n_liters') {
    return `At water processed: ${liters == null ? '...' : `${liters.toFixed(1)} L`}`;
  }
  return `At date: ${new Date().toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export default function LogTaskModal() {
  const { taskId, machineId, label, cadenceKind } = useLocalSearchParams<{
    taskId: string;
    machineId: string;
    label?: string;
    cadenceKind?: string;
  }>();
  const router = useRouter();
  const t = useTheme();
  const { mutateAsync, isPending } = useLogTask();
  const { data: snapshot } = useMaintenanceSnapshot(true);
  const showSnack = useSnackbarStore((s) => s.show);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const inputStyle = {
    borderWidth: 1,
    borderColor: t.colors.paperEdge,
    borderRadius: t.radii.md,
    padding: t.space.md,
    backgroundColor: t.colors.paperDeep,
    color: t.colors.ink,
    fontFamily: t.fonts.sans,
    fontSize: 15,
    minHeight: 84,
  } as const;

  const submit = async () => {
    if (!taskId || !machineId) return;
    setError(null);
    try {
      const trimmedNotes = notes.trim();
      await mutateAsync({
        taskId,
        machineId,
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      });
      showSnack(`${label ?? 'Task'} logged`);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log task');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header title="Mark done" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
        <Surface bg="paperDeep" padding="md" radius="md" bordered>
          <Text variant="bodyStrong">{label ?? 'Maintenance task'}</Text>
          <Text variant="caption" color={t.colors.inkSoft} style={{ marginTop: t.space.xs }}>
            {snapshotLabel(cadenceKind, snapshot?.shots, snapshot?.liters)}
          </Text>
        </Surface>

        <View>
          <Text variant="label">NOTES (OPTIONAL)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            style={inputStyle}
            placeholder="e.g. used Cafiza and rinsed twice"
            placeholderTextColor={t.colors.inkFaint}
          />
        </View>

        {error ? <Text variant="caption" color={t.colors.danger}>{error}</Text> : null}
        <Pill
          label={isPending ? 'Logging...' : 'Confirm done'}
          onPress={submit}
          disabled={isPending}
          size="lg"
        />
      </ScrollView>
    </View>
  );
}
