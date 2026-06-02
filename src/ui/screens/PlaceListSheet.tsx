import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View, type ListRenderItem } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { groupByCity } from '@/domain/places';
import type { PlaceWithUserData } from '@/features/places/types';
import { Icon } from '@/ui/icons/line';
import { PlaceCard } from '@/ui/primitives/PlaceCard';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export type StatusFilter = 'all' | 'curated' | 'wishlist' | 'visited';
const STATUS: StatusFilter[] = ['all', 'curated', 'wishlist', 'visited'];
export const LIST_SHEET_SNAP_RATIOS = [0.18, 0.5, 0.9] as const;

/** List ordering. `distance` requires a location fix; callers must fall back
 *  to `name` when no origin is available. */
export type SortMode = 'distance' | 'name';
const SORT_OPTIONS: { key: SortMode; labelKey: string }[] = [
  { key: 'distance', labelKey: 'explore.sortDistance' },
  { key: 'name', labelKey: 'explore.sortName' },
];

type PlaceListItem =
  | { type: 'header'; id: string; city: string }
  | { type: 'place'; id: string; place: PlaceWithUserData };

/** Persistent list sheet: search + status chips + city-grouped places.
 *  Snaps Peek (18%) -> Mid (50%, initial) -> Full (90%). */
export function PlaceListSheet({
  places,
  query,
  onQuery,
  statusFilter,
  onStatusFilter,
  onSelect,
  sortMode,
  onSortMode,
  canSortByDistance,
  nearest,
  onSnapIndexChange,
  animatedPosition,
}: {
  places: PlaceWithUserData[];
  query: string;
  onQuery: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusFilter: (s: StatusFilter) => void;
  onSelect: (id: string) => void;
  /** Current effective sort. */
  sortMode: SortMode;
  /** User-driven sort change. */
  onSortMode: (m: SortMode) => void;
  /** Whether a location fix is available (enables the distance chip). */
  canSortByDistance: boolean;
  nearest: boolean;
  onSnapIndexChange?: (index: number) => void;
  /** Shared value the sheet writes its top Y to, so callers can track it (e.g.
   *  a floating button that hugs the sheet like Google Maps). */
  animatedPosition?: SharedValue<number>;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const snapPoints = useMemo(() => ['18%', '50%', '90%'], []);
  const groups = useMemo(() => groupByCity(places), [places]);
  const listData = useMemo<PlaceListItem[]>(() => {
    if (sortMode === 'distance' && nearest) {
      return places.map((place) => ({ type: 'place', id: place.id, place }));
    }
    return groups.flatMap((group) => [
      { type: 'header' as const, id: `city:${group.city}`, city: group.city },
      ...group.places.map((place) => ({ type: 'place' as const, id: place.id, place })),
    ]);
  }, [groups, nearest, places, sortMode]);
  const sheetChangeProps = onSnapIndexChange ? { onChange: onSnapIndexChange } : {};
  const positionProps = animatedPosition ? { animatedPosition } : {};
  const resultLabel = places.length === 1 ? '1 place' : `${places.length} places`;

  const chip = (active: boolean) => ({
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    backgroundColor: active ? theme.colors.forest : theme.colors.paperEdge,
  });
  const chipText = (active: boolean) => ({ color: active ? theme.colors.paper : theme.colors.ink });
  const renderItem: ListRenderItem<PlaceListItem> = ({ item }) => {
    if (item.type === 'header') {
      return (
        <Text
          variant="caption"
          style={{
            color: theme.colors.inkFaint,
            marginTop: theme.space.md,
            marginBottom: theme.space.xs,
          }}
        >
          {item.city}
        </Text>
      );
    }
    return <PlaceCard place={item.place} onPress={() => onSelect(item.place.id)} />;
  };

  const listHeader = (
    <>
      <View
        style={{
          minHeight: 52,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.sm,
          borderWidth: 1,
          borderColor: theme.colors.paperEdge,
          borderRadius: theme.radii.md,
          backgroundColor: theme.colors.paperDeep,
          paddingHorizontal: theme.space.md,
          marginBottom: theme.space.sm,
        }}
      >
        <Icon name="pin" color={theme.colors.forest} size={18} />
        <TextInput
          placeholder={t('explore.searchPlaceholder')}
          value={query}
          onChangeText={onQuery}
          style={{
            flex: 1,
            paddingVertical: theme.space.sm,
            color: theme.colors.ink,
            fontFamily: theme.fonts.sans,
          }}
        />
        <Text variant="caption" color={theme.colors.inkFaint}>
          {resultLabel}
        </Text>
      </View>
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

      <View
        style={{
          flexDirection: 'row',
          gap: theme.space.sm,
          marginBottom: theme.space.md,
        }}
      >
        {SORT_OPTIONS.map((opt) => {
          const active = sortMode === opt.key;
          const disabled = opt.key === 'distance' && !canSortByDistance;
          const chipStyle = {
            ...chip(active),
            ...(disabled && !active ? { opacity: 0.4 } : null),
          };
          return (
            <Pressable
              key={opt.key}
              testID={`sort-${opt.key}`}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => onSortMode(opt.key)}
              style={chipStyle}
            >
              <Text variant="caption" style={chipText(active)}>
                {t(opt.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  const listFooter = (
    <Text variant="caption" style={{ color: theme.colors.inkFaint, marginTop: theme.space.md }}>
      {t('explore.attribution')}
    </Text>
  );

  return (
    <BottomSheet
      index={1}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      {...sheetChangeProps}
      {...positionProps}
      backgroundStyle={{ backgroundColor: theme.colors.paper }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.paperEdge }}
      style={{ zIndex: 10, elevation: 10 }}
    >
      <BottomSheetFlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.space.lg,
          paddingBottom: theme.space.xl,
        }}
      />
    </BottomSheet>
  );
}
