import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import type { MachineInput } from '@/domain/validators/machine';
import { useAddMachine } from '@/features/machines/hooks';
import { useSnackbarStore } from '@/state/snackbar';
import { Header } from '@/ui/primitives/Header';
import { Pill } from '@/ui/primitives/Pill';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

const KINDS = ['espresso_machine', 'grinder', 'kettle', 'other'] as const;
const KIND_LABELS: Record<string, string> = {
  espresso_machine: 'Espresso machine',
  grinder: 'Grinder',
  kettle: 'Kettle',
  other: 'Other',
};

export default function NewMachineScreen() {
  const router = useRouter();
  const t = useTheme();
  const { mutateAsync, isPending } = useAddMachine();
  const showSnack = useSnackbarStore((s) => s.show);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<MachineInput['kind']>('espresso_machine');
  const [model, setModel] = useState('');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
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

  const submit = async () => {
    setError(null);
    try {
      const input: MachineInput = {
        name: name.trim(),
        kind,
        ...(model.trim() && { model: model.trim() }),
        ...(vendor.trim() && { vendor: vendor.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
        isPrimary,
      };
      await mutateAsync(input);
      showSnack('Machine added');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header title="Add machine" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
        <View>
          <Text variant="label">NAME *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={inputStyle}
            placeholder="Lelit Bianca V3"
            placeholderTextColor={t.colors.inkFaint}
          />
        </View>
        <View>
          <Text variant="label">TYPE</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, marginTop: t.space.xs }}>
            {KINDS.map((k) => (
              <Pill key={k} label={KIND_LABELS[k] ?? k} variant={kind === k ? 'primary' : 'ghost'} onPress={() => setKind(k)} />
            ))}
          </View>
        </View>
        <View>
          <Text variant="label">MODEL</Text>
          <TextInput value={model} onChangeText={setModel} style={inputStyle} placeholder="optional" placeholderTextColor={t.colors.inkFaint} />
        </View>
        <View>
          <Text variant="label">VENDOR</Text>
          <TextInput value={vendor} onChangeText={setVendor} style={inputStyle} placeholder="optional" placeholderTextColor={t.colors.inkFaint} />
        </View>
        <View>
          <Text variant="label">NOTES</Text>
          <TextInput value={notes} onChangeText={setNotes} multiline style={{ ...inputStyle, minHeight: 60 }} placeholder="optional" placeholderTextColor={t.colors.inkFaint} />
        </View>
        <Pill
          label={isPrimary ? 'Primary machine' : 'Set as primary'}
          leftIcon="star"
          variant={isPrimary ? 'primary' : 'ghost'}
          onPress={() => setIsPrimary(!isPrimary)}
        />
        {error ? <Text variant="caption" color={t.colors.danger}>{error}</Text> : null}
        <Pill
          label={isPending ? 'Saving…' : 'Save machine'}
          onPress={submit}
          disabled={isPending || name.trim().length === 0}
          size="lg"
        />
      </ScrollView>
    </View>
  );
}
