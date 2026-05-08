import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';

import { useBrewStore } from '@/features/brew/store';
import { useDiscardSession, useFinalizeSession } from '@/features/brew/hooks';
import { useSnackbarStore } from '@/state/snackbar';
import { Pill } from '@/ui/primitives/Pill';
import { Sheet } from '@/ui/primitives/Sheet';
import { Stepper } from '@/ui/primitives/Stepper';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

const FLAVORS = ['bergamot', 'jasmine', 'stone fruit', 'chocolate', 'caramel', 'citrus', 'berry', 'floral'];

export default function TastingNote() {
  const t = useTheme();
  const router = useRouter();
  const session = useBrewStore((s) => s.session);
  const send = useBrewStore((s) => s.send);
  const finalize = useFinalizeSession();
  const discard = useDiscardSession();
  const showSnack = useSnackbarStore((s) => s.show);

  const [yieldG, setYieldG] = useState(session?.yieldG ?? 36);
  const [rating, setRating] = useState(0);
  const [mouthfeel, setMouthfeel] = useState(3);
  const [acidity, setAcidity] = useState(3);
  const [sweetness, setSweetness] = useState(3);
  const [bitterness, setBitterness] = useState(3);
  const [balance, setBalance] = useState(3);
  const [comment, setComment] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  // Auto-reset discard confirmation after 3 seconds
  useEffect(() => {
    if (!confirmDiscard) return;
    const id = setTimeout(() => setConfirmDiscard(false), 3000);
    return () => clearTimeout(id);
  }, [confirmDiscard]);

  if (!session) {
    router.dismissAll();
    return null;
  }

  const save = async (mode: 'keep' | 'another') => {
    await finalize.mutateAsync({
      id: session.id,
      args: {
        ...(rating ? { rating } : {}),
        ...(comment ? { comment } : {}),
        mouthfeel, acidity, sweetness, bitterness, balance,
        flavorTags: tags,
      },
    });
    send({
      type: 'save',
      mode,
      yieldG,
      ...(rating ? { rating } : {}),
      ...(comment ? { comment } : {}),
    });
    showSnack(`Shot logged · ${(yieldG / session.doseG).toFixed(2)}:1 · ${session.durationS?.toFixed(1)}s${rating ? ` · ${rating}★` : ''}`);
    if (mode === 'another') send({ type: 'reset', preserveDraft: true });
    if (mode === 'keep') router.replace('/lab/history' as never);
    else router.dismissAll();
  };

  const onDiscard = async () => {
    await discard.mutateAsync(session.id);
    send({ type: 'discard' });
    send({ type: 'reset', preserveDraft: true });
    showSnack('Shot discarded');
    router.dismissAll();
  };

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));

  return (
    <Sheet>
      <Text variant="title">Log this shot</Text>
      <Text variant="caption" style={{ marginTop: 4, marginBottom: t.space.lg }}>
        {session.durationS?.toFixed(1)}s · dose {session.doseG.toFixed(1)} g
      </Text>

      <Stepper label="Yield" unit="g" min={1} max={120} step={0.5} value={yieldG} onChange={setYieldG} />

      <View style={{ marginTop: t.space.lg }}>
        <Text variant="label">RATING</Text>
        <View style={{ flexDirection: 'row', gap: t.space.sm, marginTop: t.space.sm }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pill key={n} label={String(n)} variant={rating === n ? 'primary' : 'ghost'} onPress={() => setRating(n)} />
          ))}
        </View>
      </View>

      {[
        { label: 'Mouthfeel', value: mouthfeel, set: setMouthfeel },
        { label: 'Acidity', value: acidity, set: setAcidity },
        { label: 'Sweetness', value: sweetness, set: setSweetness },
        { label: 'Bitterness', value: bitterness, set: setBitterness },
        { label: 'Balance', value: balance, set: setBalance },
      ].map((row) => (
        <View key={row.label} style={{ marginTop: t.space.md }}>
          <Stepper label={row.label} min={1} max={5} step={1} value={row.value} onChange={row.set} />
        </View>
      ))}

      <View style={{ marginTop: t.space.lg }}>
        <Text variant="label">FLAVOR TAGS</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, marginTop: t.space.sm }}>
          {FLAVORS.map((f) => (
            <Pill key={f} label={f} variant={tags.includes(f) ? 'primary' : 'ghost'} onPress={() => toggleTag(f)} />
          ))}
        </View>
      </View>

      <View style={{ marginTop: t.space.lg }}>
        <Text variant="label">NOTES</Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          multiline
          style={{
            marginTop: 4, borderWidth: 1, borderColor: t.colors.paperEdge,
            backgroundColor: t.colors.paperDeep, padding: t.space.md, borderRadius: t.radii.md,
            minHeight: 80, fontFamily: t.fonts.sans, color: t.colors.ink,
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.xl }}>
        <Pill label="Save" onPress={() => save('keep')} size="lg" style={{ flex: 1 }} />
        <Pill label="Save & log another" variant="ghost" onPress={() => save('another')} size="lg" style={{ flex: 1 }} />
      </View>
      <Pill
        label={confirmDiscard ? 'Tap again to confirm discard' : 'Discard shot'}
        variant={confirmDiscard ? 'danger' : 'ghost'}
        onPress={() => {
          if (confirmDiscard) onDiscard();
          else setConfirmDiscard(true);
        }}
        style={{ marginTop: t.space.md }}
      />
    </Sheet>
  );
}
