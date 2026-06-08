import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import type { MaintenanceTaskInput } from '@/domain/validators/maintenance';
import { useAddTask } from '@/features/maintenance/hooks';
import { useSnackbarStore } from '@/state/snackbar';
import { Header } from '@/ui/primitives/Header';
import { Pill } from '@/ui/primitives/Pill';
import { Stepper } from '@/ui/primitives/Stepper';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

const TASK_KINDS = [
  { kind: 'backflush' as const, label: 'Backflush' },
  { kind: 'descale' as const, label: 'Descale' },
  { kind: 'filter_replace' as const, label: 'Filter replace' },
  { kind: 'gasket_replace' as const, label: 'Gasket replace' },
  { kind: 'burr_clean' as const, label: 'Burr clean' },
  { kind: 'group_screen_clean' as const, label: 'Group screen' },
  { kind: 'custom' as const, label: 'Custom' },
];

const CADENCE_KINDS = [
  { value: 'every_n_days' as const, label: 'Days' },
  { value: 'every_n_shots' as const, label: 'Shots' },
  { value: 'every_n_liters' as const, label: 'Liters' },
];

export default function AddTaskScreen() {
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const router = useRouter();
  const t = useTheme();
  const { mutateAsync, isPending } = useAddTask();
  const showSnack = useSnackbarStore((s) => s.show);

  const [kind, setKind] = useState<MaintenanceTaskInput['kind']>('backflush');
  const [label, setLabel] = useState('Backflush group head');
  const [cadenceKind, setCadenceKind] = useState<MaintenanceTaskInput['cadenceKind']>('every_n_days');
  const [cadenceValue, setCadenceValue] = useState(7);
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
  } as const;

  const selectKind = (k: MaintenanceTaskInput['kind']) => {
    setKind(k);
    const preset = TASK_KINDS.find((x) => x.kind === k);
    if (preset) setLabel(preset.label);
  };

  const submit = async () => {
    if (!machineId) return;
    setError(null);
    try {
      await mutateAsync({
        machineId,
        kind,
        label: label.trim(),
        cadenceKind,
        cadenceValue,
        ...(notes.trim() && { notes: notes.trim() }),
      });
      showSnack('Task added');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header title="Add task" onBack={() => router.back()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
        <View>
          <Text variant="label">TASK TYPE</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, marginTop: t.space.xs }}>
            {TASK_KINDS.map((k) => (
              <Pill key={k.kind} label={k.label} variant={kind === k.kind ? 'primary' : 'ghost'} onPress={() => selectKind(k.kind)} />
            ))}
          </View>
        </View>
        <View>
          <Text variant="label">LABEL</Text>
          <TextInput value={label} onChangeText={setLabel} style={inputStyle} placeholderTextColor={t.colors.inkFaint} />
        </View>
        <View>
          <Text variant="label">CADENCE TYPE</Text>
          <View style={{ flexDirection: 'row', gap: t.space.sm, marginTop: t.space.xs }}>
            {CADENCE_KINDS.map((c) => (
              <Pill key={c.value} label={c.label} variant={cadenceKind === c.value ? 'primary' : 'ghost'} onPress={() => setCadenceKind(c.value)} />
            ))}
          </View>
        </View>
        <View>
          <Text variant="label">EVERY</Text>
          <Stepper
            label="Every"
            unit={cadenceKind.replace('every_n_', '')}
            value={cadenceValue}
            min={1}
            max={cadenceKind === 'every_n_days' ? 365 : cadenceKind === 'every_n_shots' ? 2000 : 500}
            step={cadenceKind === 'every_n_days' ? 1 : cadenceKind === 'every_n_shots' ? 10 : 5}
            onChange={setCadenceValue}
          />
        </View>
        <View>
          <Text variant="label">NOTES (OPTIONAL)</Text>
          <TextInput value={notes} onChangeText={setNotes} multiline style={{ ...inputStyle, minHeight: 60 }} placeholder="e.g. use backflush detergent" placeholderTextColor={t.colors.inkFaint} />
        </View>
        {error ? <Text variant="caption" color={t.colors.danger}>{error}</Text> : null}
        <Pill
          label={isPending ? 'Saving…' : 'Save task'}
          onPress={submit}
          disabled={isPending || label.trim().length === 0}
          size="lg"
        />
      </ScrollView>
    </View>
  );
}
