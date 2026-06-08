import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import type { BeanInput } from '@/domain/validators/bean';
import { useAddBean } from '@/features/beans/hooks';
import { useSnackbarStore } from '@/state/snackbar';
import { Header } from '@/ui/primitives/Header';
import { Pill } from '@/ui/primitives/Pill';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

const PROCESSES = ['washed', 'natural', 'honey', 'anaerobic', 'other'] as const;
const FLAVORS = ['chocolate', 'citrus', 'berry', 'floral', 'nutty', 'caramel', 'stone fruit', 'spice'] as const;

export default function NewBean() {
  const router = useRouter();
  const t = useTheme();
  const { mutateAsync, isPending } = useAddBean();
  const showSnack = useSnackbarStore((s) => s.show);

  // Primary fields
  const [name, setName] = useState('');
  const [roaster, setRoaster] = useState('');
  const [origin, setOrigin] = useState('');
  const [roastLevel, setRoastLevel] = useState<number | undefined>(undefined);
  const [startWeight, setStartWeight] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Detail fields (expandable)
  const [showDetails, setShowDetails] = useState(false);
  const [process, setProcess] = useState<'washed' | 'natural' | 'honey' | 'anaerobic' | 'other' | undefined>(undefined);
  const [variety, setVariety] = useState('');
  const [altitude, setAltitude] = useState('');
  const [flavorTags, setFlavorTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const toggleTag = (tag: string) =>
    setFlavorTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));

  const submit = async () => {
    setErrorMsg(null);
    try {
      const trimmedRoaster = roaster.trim();
      const trimmedOrigin = origin.trim();
      const trimmedVariety = variety.trim();
      const trimmedNotes = notes.trim();
      const startWeightG = startWeight ? Number(startWeight) : undefined;
      const altitudeMasl = altitude ? Number(altitude) : undefined;
      const input: BeanInput = {
        name: name.trim(),
        ...(trimmedRoaster.length > 0 && { roaster: trimmedRoaster }),
        ...(trimmedOrigin.length > 0 && { origin: trimmedOrigin }),
        ...(roastLevel !== undefined && { roastLevel }),
        ...(startWeightG !== undefined && { startWeightG }),
        ...(process && { process }),
        ...(trimmedVariety.length > 0 && { variety: trimmedVariety }),
        ...(altitudeMasl !== undefined && !isNaN(altitudeMasl) && { altitudeMasl }),
        ...(flavorTags.length > 0 && { flavorTags }),
        ...(trimmedNotes.length > 0 && { notes: trimmedNotes }),
      };
      await mutateAsync(input);
      showSnack('Bean added');
      router.back();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to save');
    }
  };

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

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header title="New bean" onBack={() => router.back()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
        {/* Primary fields */}
        <View>
          <Text variant="label">NAME *</Text>
          <TextInput value={name} onChangeText={setName} style={inputStyle} placeholder="Yirgacheffe Konga" placeholderTextColor={t.colors.inkFaint} />
        </View>
        <View>
          <Text variant="label">ROASTER</Text>
          <TextInput value={roaster} onChangeText={setRoaster} style={inputStyle} placeholder="Onyx Coffee Lab" placeholderTextColor={t.colors.inkFaint} />
        </View>
        <View>
          <Text variant="label">ORIGIN</Text>
          <TextInput value={origin} onChangeText={setOrigin} style={inputStyle} placeholder="Ethiopia" placeholderTextColor={t.colors.inkFaint} />
        </View>
        <View>
          <Text variant="label">ROAST LEVEL (1–5)</Text>
          <View style={{ flexDirection: 'row', gap: t.space.sm, marginTop: t.space.xs }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pill key={n} label={String(n)} variant={roastLevel === n ? 'primary' : 'ghost'} onPress={() => setRoastLevel(n)} />
            ))}
          </View>
        </View>
        <View>
          <Text variant="label">BAG SIZE (G)</Text>
          <TextInput value={startWeight} onChangeText={setStartWeight} keyboardType="numeric" style={inputStyle} placeholder="250" placeholderTextColor={t.colors.inkFaint} />
        </View>

        {/* Expandable details */}
        <Pill
          label={showDetails ? '▼ Less details' : '▶ More details'}
          variant="ghost"
          onPress={() => setShowDetails(!showDetails)}
        />

        {showDetails ? (
          <View style={{ gap: t.space.md }}>
            <View>
              <Text variant="label">PROCESS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, marginTop: t.space.xs }}>
                {PROCESSES.map((p) => (
                  <Pill key={p} label={p} variant={process === p ? 'primary' : 'ghost'} onPress={() => setProcess(p === process ? undefined : p)} />
                ))}
              </View>
            </View>
            <View>
              <Text variant="label">VARIETY</Text>
              <TextInput value={variety} onChangeText={setVariety} style={inputStyle} placeholder="Heirloom" placeholderTextColor={t.colors.inkFaint} />
            </View>
            <View>
              <Text variant="label">ALTITUDE (MASL)</Text>
              <TextInput value={altitude} onChangeText={setAltitude} keyboardType="numeric" style={inputStyle} placeholder="1900" placeholderTextColor={t.colors.inkFaint} />
            </View>
            <View>
              <Text variant="label">FLAVOR TAGS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, marginTop: t.space.xs }}>
                {FLAVORS.map((f) => (
                  <Pill key={f} label={f} variant={flavorTags.includes(f) ? 'primary' : 'ghost'} onPress={() => toggleTag(f)} />
                ))}
              </View>
            </View>
            <View>
              <Text variant="label">NOTES</Text>
              <TextInput value={notes} onChangeText={setNotes} multiline style={{ ...inputStyle, minHeight: 60 }} placeholder="Personal tasting notes…" placeholderTextColor={t.colors.inkFaint} />
            </View>
          </View>
        ) : null}

        {errorMsg ? (
          <Text variant="caption" color={t.colors.danger}>{errorMsg}</Text>
        ) : null}
        <Pill
          label={isPending ? 'Saving…' : 'Save bean'}
          onPress={submit}
          disabled={isPending || name.trim().length === 0}
          size="lg"
        />
      </ScrollView>
    </View>
  );
}
