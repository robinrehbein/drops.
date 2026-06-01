import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import {
  filterPlaces,
  groupByCity,
  placeStatus,
  placeStats,
  sortPlaces,
  type LatLng,
} from '@/domain/places';
import { usePlaces } from '@/features/places/hooks';
import type { PlaceWithUserData } from '@/features/places/types';
import { PlaceCard } from '@/ui/primitives/PlaceCard';
import { Text } from '@/ui/primitives/Text';
import { ExploreMap } from '@/ui/screens/ExploreMap';
import { useTheme } from '@/ui/theme/useTheme';

type StatusFilter = 'all' | 'curated' | 'wishlist' | 'visited';

export function ExploreScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { data: places = [] } = usePlaces();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const nearest = origin !== null;

  const byStatus = useMemo(
    () =>
      places.filter((p) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'curated') return p.curated;
        return placeStatus(p.userData) === statusFilter;
      }),
    [places, statusFilter],
  );
  const filtered = useMemo(() => filterPlaces(byStatus, { query }), [byStatus, query]);
  const sorted = useMemo(
    () => sortPlaces(filtered, nearest ? 'distance' : 'name', origin ?? undefined),
    [filtered, nearest, origin],
  );
  const stats = useMemo(() => placeStats(places.map((p) => p.userData ?? {})), [places]);
  const groups = useMemo(() => groupByCity(filtered), [filtered]);

  const chip = (active: boolean) => ({
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    backgroundColor: active ? theme.colors.forest : theme.colors.paperEdge,
  });
  const chipText = (active: boolean) => ({ color: active ? theme.colors.paper : theme.colors.ink });

  async function toggleNearest() {
    if (nearest) {
      setOrigin(null);
      return;
    }
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({});
    setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  }

  const renderCard = (p: PlaceWithUserData) => (
    <PlaceCard key={p.id} place={p} onPress={() => router.push(`/explore/${p.id}` as never)} />
  );

  const STATUS: StatusFilter[] = ['all', 'curated', 'wishlist', 'visited'];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.paper }}
      contentContainerStyle={{ padding: theme.space.lg }}
      scrollEnabled={mode !== 'map'}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.space.xs,
        }}
      >
        <Text variant="title">{t('explore.title')}</Text>
        <Pressable onPress={() => router.push('/explore/new' as never)}>
          <Text variant="bodyStrong" color={theme.colors.forest}>
            {t('explore.addPlace')}
          </Text>
        </Pressable>
      </View>
      <Text
        variant="caption"
        style={{ color: theme.colors.inkFaint, marginBottom: theme.space.md }}
      >
        {t('explore.statLine', { visited: stats.visited, wishlist: stats.wishlist })}
      </Text>

      <View style={{ flexDirection: 'row', gap: theme.space.sm, marginBottom: theme.space.md }}>
        {(['list', 'map'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            testID={`mode-${m}`}
            style={chip(mode === m)}
          >
            <Text variant="caption" style={chipText(mode === m)}>
              {m === 'list' ? t('explore.list') : t('explore.map')}
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={toggleNearest} testID="sort-nearest" style={chip(nearest)}>
          <Text variant="caption" style={chipText(nearest)}>
            {t('explore.nearest')}
          </Text>
        </Pressable>
      </View>

      <TextInput
        placeholder={t('explore.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
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
            onPress={() => setStatusFilter(s)}
            testID={`status-${s}`}
            style={chip(statusFilter === s)}
          >
            <Text variant="caption" style={chipText(statusFilter === s)}>
              {t(`explore.filter_${s}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'map' ? (
        <View style={{ height: 420, overflow: 'hidden', borderRadius: theme.radii.sm }}>
          <ExploreMap places={sorted} onSelect={(id) => router.push(`/explore/${id}` as never)} />
        </View>
      ) : nearest ? (
        // Distance-sorted flat list (city grouping would re-sort by name)
        sorted.map(renderCard)
      ) : (
        groups.map((g) => (
          <View key={g.city} style={{ marginBottom: theme.space.lg }}>
            <Text
              variant="caption"
              style={{ color: theme.colors.inkFaint, marginBottom: theme.space.xs }}
            >
              {g.city}
            </Text>
            {g.places.map(renderCard)}
          </View>
        ))
      )}

      <Text variant="caption" style={{ color: theme.colors.inkFaint, marginTop: theme.space.md }}>
        {t('explore.attribution')}
      </Text>
    </ScrollView>
  );
}
