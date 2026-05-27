import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { useRecipeForBean } from '@/features/recipes/hooks';
import { useSaveRecipeFromSession } from '@/features/recipes/hooks';
import { useSession } from '@/features/brew/hooks';
import { useSnackbarStore } from '@/state/snackbar';
import { Header } from '@/ui/primitives/Header';
import { MetricTile } from '@/ui/primitives/MetricTile';
import { Pill } from '@/ui/primitives/Pill';
import { Text } from '@/ui/primitives/Text';
import { Surface } from '@/ui/primitives/Surface';
import { brewRatio, formatRatio } from '@/domain/ratio';
import { useTheme } from '@/ui/theme/useTheme';

export default function RecipeSaveModal() {
  const { sessionId, beanId } = useLocalSearchParams<{ sessionId: string; beanId: string }>();
  const router = useRouter();
  const t = useTheme();
  const { data: session } = useSession(sessionId ?? '');
  const { data: existingRecipe } = useRecipeForBean(beanId ?? null);
  const { mutateAsync, isPending } = useSaveRecipeFromSession();
  const showSnack = useSnackbarStore((s) => s.show);
  const [notes, setNotes] = useState('');

  const isReplace = !!existingRecipe;

  const save = async () => {
    if (!sessionId) return;
    const trimmedNotes = notes.trim();
    await mutateAsync({ sessionId, ...(trimmedNotes ? { notes: trimmedNotes } : {}) });
    showSnack(isReplace ? 'Recipe updated' : 'Recipe saved');
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
    minHeight: 60,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header title={isReplace ? 'Replace recipe' : 'Save as recipe'} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
        {session ? (
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
        ) : null}

        {isReplace ? (
          <Text variant="caption" color={t.colors.amber}>
            This will replace the existing recipe for this bean.
          </Text>
        ) : null}

        <View>
          <Text variant="label">RECIPE NOTES (OPTIONAL)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            style={inputStyle}
            placeholder="e.g. purge 4 turns coarser, then dial back"
            placeholderTextColor={t.colors.inkFaint}
          />
        </View>

        <Pill
          label={isPending ? 'Saving…' : isReplace ? 'Replace recipe' : 'Save as recipe'}
          onPress={save}
          disabled={isPending}
          size="lg"
        />
      </ScrollView>
    </View>
  );
}
