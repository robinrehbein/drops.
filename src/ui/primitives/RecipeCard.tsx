import { TouchableOpacity, View } from 'react-native';

import type { RecipeRow } from '@/features/recipes/types';
import { recipeLabel } from '@/domain/recipe-label';
import { useTheme } from '@/ui/theme/useTheme';
import { Surface } from './Surface';
import { Text } from './Text';

function fmt(val: number | null | undefined, unit: string) {
  if (val == null) return null;
  return `${val.toFixed(1)} ${unit}`;
}

export function RecipeCard({
  recipe,
  isDefault = false,
  savedFromCaption,
  onEdit,
  onSetDefault,
  onDelete,
}: {
  recipe: RecipeRow | null;
  /** Show the "Default" badge (this is the bean's auto-applied recipe). */
  isDefault?: boolean;
  savedFromCaption?: string;
  onEdit?: () => void;
  onSetDefault?: () => void;
  onDelete?: () => void;
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
          No recipes yet. Save a shot as a recipe, or add one manually.
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
  // Show a friendly name when present; otherwise the params double as the title.
  const title = recipe.name?.trim() ? recipe.name.trim() : recipeLabel(recipe);

  return (
    <Surface testID="recipe-card" bg="paperDeep" padding="md" radius="md" bordered>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {title}
        </Text>
        {isDefault ? (
          <View
            style={{
              backgroundColor: t.colors.forestPale,
              paddingHorizontal: t.space.sm,
              paddingVertical: 2,
              borderRadius: t.radii.pill,
            }}
          >
            <Text variant="caption" color={t.colors.forest}>
              Default
            </Text>
          </View>
        ) : null}
      </View>
      {parts.length > 0 ? (
        <Text variant="caption" color={t.colors.inkSoft} style={{ marginTop: t.space.xs }}>
          {parts.join(' · ')}
        </Text>
      ) : null}
      {savedFromCaption ? (
        <Text variant="caption" color={t.colors.inkSoft} style={{ marginTop: t.space.xs }}>
          {savedFromCaption}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
        {onSetDefault && !isDefault ? (
          <TouchableOpacity onPress={onSetDefault} accessibilityLabel="Set as default recipe">
            <Text variant="caption" color={t.colors.forest}>Set default</Text>
          </TouchableOpacity>
        ) : null}
        {onEdit ? (
          <TouchableOpacity onPress={onEdit} accessibilityLabel="Edit recipe">
            <Text variant="caption" color={t.colors.forest}>Edit</Text>
          </TouchableOpacity>
        ) : null}
        {onDelete ? (
          <TouchableOpacity onPress={onDelete} accessibilityLabel="Delete recipe">
            <Text variant="caption" color={t.colors.danger}>Delete</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Surface>
  );
}
