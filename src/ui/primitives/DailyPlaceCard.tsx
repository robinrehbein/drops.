import { Surface } from './Surface';
import { Text } from './Text';

import type { DailyPick } from '@/domain/daily-place';
import { formatDistance } from '@/domain/places';
import type { PlaceWithUserData } from '@/features/places/types';
import { useTheme } from '@/ui/theme/useTheme';

const KIND_LABEL: Record<string, string> = {
  roaster: 'Roaster',
  coffee_shop: 'Coffee shop',
  cafe: 'Café',
};

/** Daily discovery prompt: a nearby curated spot the user hasn't visited yet. */
export function DailyPlaceCard({ pick }: { pick: DailyPick<PlaceWithUserData> | null }) {
  const t = useTheme();
  if (!pick) return null;

  const { place, distanceKm } = pick;
  const kind = KIND_LABEL[place.kind] ?? place.kind;
  const meta = distanceKm != null ? `${kind} · ${formatDistance(distanceKm)}` : kind;

  return (
    <Surface testID="daily-place-card" bg="paperDeep" padding="md" radius="md" bordered>
      <Text variant="label">TRY SOMETHING NEW</Text>
      <Text variant="heading" style={{ marginTop: t.space.xs }}>
        {place.name}
      </Text>
      <Text variant="caption" color={t.colors.inkFaint} style={{ marginTop: 2 }}>
        {meta}
      </Text>
      {place.editorialNote ? (
        <Text variant="body" color={t.colors.inkSoft} style={{ marginTop: t.space.sm }}>
          {place.editorialNote}
        </Text>
      ) : null}
    </Surface>
  );
}
