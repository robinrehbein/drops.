import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { filterPlaces, groupByCity, placeStats } from '@/domain/places';
import { usePlaces } from '@/features/places/hooks';
import { PlaceCard } from '@/ui/primitives/PlaceCard';
import { Text } from '@/ui/primitives/Text';
import { ExploreMap } from '@/ui/screens/ExploreMap';
import { useTheme } from '@/ui/theme/useTheme';

export function ExploreScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { data: places = [] } = usePlaces();
  const [query, setQuery] = useState('');
  const [curatedOnly, setCuratedOnly] = useState(false);
  const [mode, setMode] = useState<'list' | 'map'>('list');

  const filtered = useMemo(
    () => filterPlaces(places, { query, curatedOnly }),
    [places, query, curatedOnly],
  );
  const stats = useMemo(() => placeStats(places.map((p) => p.userData ?? {})), [places]);
  const groups = useMemo(() => groupByCity(filtered), [filtered]);

  const chip = (active: boolean) => ({
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    backgroundColor: active ? theme.colors.forest : theme.colors.paperEdge,
  });

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
            <Text
              variant="caption"
              style={{ color: mode === m ? theme.colors.paper : theme.colors.ink }}
            >
              {m === 'list' ? t('explore.list') : t('explore.map')}
            </Text>
          </Pressable>
        ))}
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

      <Pressable
        onPress={() => setCuratedOnly((v) => !v)}
        style={[chip(curatedOnly), { alignSelf: 'flex-start', marginBottom: theme.space.md }]}
      >
        <Text
          variant="caption"
          style={{ color: curatedOnly ? theme.colors.paper : theme.colors.ink }}
        >
          {t('explore.curatedOnly')}
        </Text>
      </Pressable>

      {mode === 'map' ? (
        <View style={{ height: 420, overflow: 'hidden', borderRadius: theme.radii.sm }}>
          <ExploreMap places={filtered} onSelect={(id) => router.push(`/explore/${id}` as never)} />
        </View>
      ) : (
        groups.map((g) => (
          <View key={g.city} style={{ marginBottom: theme.space.lg }}>
            <Text
              variant="caption"
              style={{ color: theme.colors.inkFaint, marginBottom: theme.space.xs }}
            >
              {g.city}
            </Text>
            {g.places.map((p) => (
              <PlaceCard
                key={p.id}
                place={p}
                onPress={() => router.push(`/explore/${p.id}` as never)}
              />
            ))}
          </View>
        ))
      )}

      <Text variant="caption" style={{ color: theme.colors.inkFaint, marginTop: theme.space.md }}>
        {t('explore.attribution')}
      </Text>
    </ScrollView>
  );
}
