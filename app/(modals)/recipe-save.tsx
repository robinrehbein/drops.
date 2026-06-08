import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import {
  useCreateRecipe,
  useRecipesForBean,
  useSaveRecipeFromSession,
  useUpdateRecipe,
} from '@/features/recipes/hooks';
import { useSession } from '@/features/brew/hooks';
import { useSnackbarStore } from '@/state/snackbar';
import { Header } from '@/ui/primitives/Header';
import { MetricTile } from '@/ui/primitives/MetricTile';
import { Pill } from '@/ui/primitives/Pill';
import { Stepper } from '@/ui/primitives/Stepper';
import { Text } from '@/ui/primitives/Text';
import { Surface } from '@/ui/primitives/Surface';
import { brewRatio, formatRatio } from '@/domain/ratio';
import { useTheme } from '@/ui/theme/useTheme';

function parseNum(s: string): number | null {
  const n = Number(s);
  return s.trim() !== '' && Number.isFinite(n) ? n : null;
}

export default function RecipeSaveModal() {
  const { sessionId, beanId, recipeId } = useLocalSearchParams<{
    sessionId?: string;
    beanId: string;
    recipeId?: string;
  }>();
  const router = useRouter();
  const t = useTheme();
  const { data: session } = useSession(sessionId ?? '');
  const { data: beanRecipes } = useRecipesForBean(beanId ?? null);
  const editing = beanRecipes?.find((r) => r.id === recipeId) ?? null;
  // From a finished shot (read-only params) vs. manual/edit (editable params).
  const fromSession = !!sessionId && !recipeId;

  const saveFromSession = useSaveRecipeFromSession();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const showSnack = useSnackbarStore((s) => s.show);

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [doseG, setDoseG] = useState(18);
  const [targetYieldG, setTargetYieldG] = useState(36);
  const [grind, setGrind] = useState('');
  const [timeS, setTimeS] = useState('');
  const [tempC, setTempC] = useState('');

  // Hydrate the form once when editing an existing recipe.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (editing && !hydrated) {
      setName(editing.name ?? '');
      setNotes(editing.notes ?? '');
      setDoseG(editing.doseG ?? 18);
      setTargetYieldG(editing.targetYieldG ?? 36);
      setGrind(editing.grindSetting ?? '');
      setTimeS(editing.durationTargetS != null ? String(editing.durationTargetS) : '');
      setTempC(editing.waterTempC != null ? String(editing.waterTempC) : '');
      setHydrated(true);
    }
  }, [editing, hydrated]);

  const isPending = saveFromSession.isPending || createRecipe.isPending || updateRecipe.isPending;
  const title = editing ? 'Edit recipe' : fromSession ? 'Save as recipe' : 'New recipe';

  const save = async () => {
    const trimmedName = name.trim();
    const trimmedNotes = notes.trim();
    if (editing) {
      await updateRecipe.mutateAsync({
        id: editing.id,
        patch: {
          name: trimmedName || null,
          doseG,
          targetYieldG,
          durationTargetS: parseNum(timeS),
          grindSetting: grind.trim() || null,
          waterTempC: parseNum(tempC),
          ratioTarget: brewRatio(doseG, targetYieldG),
          notes: trimmedNotes || null,
        },
      });
      showSnack('Recipe updated');
    } else if (fromSession) {
      await saveFromSession.mutateAsync({
        sessionId: sessionId!,
        name: trimmedName || null,
        notes: trimmedNotes || null,
      });
      showSnack('Recipe saved');
    } else {
      if (!beanId) return;
      await createRecipe.mutateAsync({
        beanId,
        name: trimmedName || null,
        doseG,
        targetYieldG,
        durationTargetS: parseNum(timeS),
        grindSetting: grind.trim() || null,
        waterTempC: parseNum(tempC),
        ratioTarget: brewRatio(doseG, targetYieldG),
        notes: trimmedNotes || null,
      });
      showSnack('Recipe saved');
    }
    router.back();
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
      <Header title={title} onBack={() => router.back()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
        <View>
          <Text variant="label">NAME (OPTIONAL)</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={inputStyle}
            placeholder="e.g. Morning, light roast"
            placeholderTextColor={t.colors.inkFaint}
          />
        </View>

        {fromSession && session ? (
          <Surface bg="paperDeep" padding="md" radius="md" bordered>
            <Text variant="caption" color={t.colors.inkSoft}>
              Values being locked in:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, marginTop: t.space.sm }}>
              <MetricTile label="DOSE" value={`${session.doseG.toFixed(1)} g`} />
              {session.yieldG != null && <MetricTile label="YIELD" value={`${session.yieldG.toFixed(1)} g`} />}
              {session.durationS != null && <MetricTile label="TIME" value={`${session.durationS.toFixed(1)} s`} />}
              {session.grindSetting && <MetricTile label="GRIND" value={session.grindSetting} />}
              {session.waterTempC != null && <MetricTile label="TEMP" value={`${session.waterTempC.toFixed(0)} °C`} />}
              <MetricTile label="RATIO" value={formatRatio(brewRatio(session.doseG, session.yieldG ?? 0))} />
            </View>
          </Surface>
        ) : (
          <View style={{ gap: t.space.md }}>
            <Stepper label="Dose" unit="g" min={5} max={30} step={0.1} value={doseG} onChange={setDoseG} />
            <Stepper
              label="Target yield"
              unit="g"
              min={5}
              max={80}
              step={0.5}
              value={targetYieldG}
              onChange={setTargetYieldG}
            />
            <View>
              <Text variant="label">GRIND SETTING</Text>
              <TextInput value={grind} onChangeText={setGrind} style={inputStyle} placeholder="e.g. 20" placeholderTextColor={t.colors.inkFaint} />
            </View>
            <View style={{ flexDirection: 'row', gap: t.space.md }}>
              <View style={{ flex: 1 }}>
                <Text variant="label">TARGET TIME (S)</Text>
                <TextInput value={timeS} onChangeText={setTimeS} keyboardType="numeric" style={inputStyle} placeholder="28" placeholderTextColor={t.colors.inkFaint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label">WATER TEMP (°C)</Text>
                <TextInput value={tempC} onChangeText={setTempC} keyboardType="numeric" style={inputStyle} placeholder="93" placeholderTextColor={t.colors.inkFaint} />
              </View>
            </View>
            <Text variant="caption" color={t.colors.inkSoft}>
              Ratio {formatRatio(brewRatio(doseG, targetYieldG))}
            </Text>
          </View>
        )}

        <View>
          <Text variant="label">RECIPE NOTES (OPTIONAL)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            style={{ ...inputStyle, minHeight: 60 }}
            placeholder="e.g. purge 4 turns coarser, then dial back"
            placeholderTextColor={t.colors.inkFaint}
          />
        </View>

        <Pill
          label={isPending ? 'Saving…' : editing ? 'Save changes' : 'Save recipe'}
          onPress={save}
          disabled={isPending}
          size="lg"
        />
      </ScrollView>
    </View>
  );
}
