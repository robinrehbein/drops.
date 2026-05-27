import { TouchableOpacity, View } from 'react-native';

import type { RecipeRow } from '@/features/recipes/types';
import { useTheme } from '@/ui/theme/useTheme';
import { Surface } from './Surface';
import { Text } from './Text';

function fmt(val: number | null | undefined, unit: string) {
  if (val == null) return null;
  return `${val.toFixed(1)} ${unit}`;
}

export function RecipeCard({
  recipe,
  savedFromCaption,
  onEdit,
  onClear,
}: {
  recipe: RecipeRow | null;
  savedFromCaption?: string;
  onEdit?: () => void;
  onClear?: () => void;
}) {
  const t = useTheme();

  if (!recipe) {
    return (
      <View
        testID="recipe-card-empty"
        style={{
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: t.colors.paperEdge,
          borderRadius: t.radii.md,
          padding: t.space.md,
          alignItems: 'center',
        }}
      >
        <Text variant="body" color={t.colors.inkSoft}>
          No recipe yet. Pull a great shot, then save it as the recipe from its session detail.
        </Text>
      </View>
    );
  }

  const parts = [
    fmt(recipe.doseG, 'g Dose'),
    fmt(recipe.targetYieldG, 'g Yield'),
    recipe.durationTargetS != null ? `${recipe.durationTargetS.toFixed(1)} s` : null,
    recipe.grindSetting != null ? `Grind ${recipe.grindSetting}` : null,
    recipe.waterTempC != null ? `${recipe.waterTempC.toFixed(0)} °C` : null,
  ].filter(Boolean);

  return (
    <Surface testID="recipe-card" bg="paperDeep" padding="md" radius="md" bordered>
      <Text variant="bodyStrong">{parts.join(' · ')}</Text>
      {savedFromCaption ? (
        <Text variant="caption" color={t.colors.inkSoft} style={{ marginTop: t.space.xs }}>
          {savedFromCaption}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: t.space.sm, marginTop: t.space.sm }}>
        {onEdit ? (
          <TouchableOpacity onPress={onEdit} accessibilityLabel="Edit recipe">
            <Text variant="caption" color={t.colors.forest}>Edit</Text>
          </TouchableOpacity>
        ) : null}
        {onClear ? (
          <TouchableOpacity onPress={onClear} accessibilityLabel="Clear recipe">
            <Text variant="caption" color={t.colors.amber}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Surface>
  );
}
