import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';

import { groupByCity } from '@/domain/places';
import type { PlaceWithUserData } from '@/features/places/types';
import { PlaceCard } from '@/ui/primitives/PlaceCard';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export type StatusFilter = 'all' | 'curated' | 'wishlist' | 'visited';
const STATUS: StatusFilter[] = ['all', 'curated', 'wishlist', 'visited'];
export const LIST_SHEET_SNAP_RATIOS = [0.18, 0.5, 0.9] as const;

/** Persistent list sheet: search + status chips + city-grouped places.
 *  Snaps Peek (18%) -> Mid (50%, initial) -> Full (90%). */
export function PlaceListSheet({
  places,
  query,
  onQuery,
  statusFilter,
  onStatusFilter,
  onSelect,
  nearest,
  onSnapIndexChange,
}: {
  places: PlaceWithUserData[];
  query: string;
  onQuery: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusFilter: (s: StatusFilter) => void;
  onSelect: (id: string) => void;
  nearest: boolean;
  onSnapIndexChange?: (index: number) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const snapPoints = useMemo(() => ['18%', '50%', '90%'], []);
  const groups = useMemo(() => groupByCity(places), [places]);
  const sheetChangeProps = onSnapIndexChange ? { onChange: onSnapIndexChange } : {};

  const chip = (active: boolean) => ({
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    backgroundColor: active ? theme.colors.forest : theme.colors.paperEdge,
  });
  const chipText = (active: boolean) => ({ color: active ? theme.colors.paper : theme.colors.ink });

  return (
    <BottomSheet
      index={1}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      {...sheetChangeProps}
      backgroundStyle={{ backgroundColor: theme.colors.paper }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.paperEdge }}
      style={{ zIndex: 10, elevation: 10 }}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.space.lg,
          paddingBottom: theme.space.xl,
        }}
      >
        <TextInput
          placeholder={t('explore.searchPlaceholder')}
          value={query}
          onChangeText={onQuery}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.paperEdge,
            borderRadius: theme.radii.sm,
            padding: theme.space.md,
            marginBottom: theme.space.sm,
            color: theme.colors.ink,
            fontFamily: theme.fonts.sans,
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.space.sm,
            marginBottom: theme.space.md,
          }}
        >
          {STATUS.map((s) => (
            <Pressable
              key={s}
              testID={`status-${s}`}
              onPress={() => onStatusFilter(s)}
              style={chip(statusFilter === s)}
            >
              <Text variant="caption" style={chipText(statusFilter === s)}>
                {t(`explore.filter_${s}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {nearest
          ? places.map((p) => <PlaceCard key={p.id} place={p} onPress={() => onSelect(p.id)} />)
          : groups.map((g) => (
              <View key={g.city} style={{ marginBottom: theme.space.lg }}>
                <Text
                  variant="caption"
                  style={{ color: theme.colors.inkFaint, marginBottom: theme.space.xs }}
                >
                  {g.city}
                </Text>
                {g.places.map((p) => (
                  <PlaceCard key={p.id} place={p} onPress={() => onSelect(p.id)} />
                ))}
              </View>
            ))}

        <Text variant="caption" style={{ color: theme.colors.inkFaint, marginTop: theme.space.md }}>
          {t('explore.attribution')}
        </Text>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
