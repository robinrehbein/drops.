import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { useMilestones, useSession, useTastingNotes } from '@/features/brew/hooks';
import { useBean } from '@/features/beans/hooks';
import { useRecipeForBean } from '@/features/recipes/hooks';
import { shareShotCard } from '@/features/export/shot-card';
import { brewRatio, formatRatio } from '@/domain/ratio';
import { format } from 'date-fns';
import { formatElapsed } from '@/domain/format';
import { Header } from '@/ui/primitives/Header';
import { MetricTile } from '@/ui/primitives/MetricTile';
import { Pill } from '@/ui/primitives/Pill';
import { Surface } from '@/ui/primitives/Surface';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const { data: session } = useSession(id ?? '');
  const { data: bean } = useBean(session?.beanId ?? '');
  const { data: milestones } = useMilestones(id ?? '');
  const { data: tastingNote } = useTastingNotes(id ?? '');
  const { data: recipe } = useRecipeForBean(session?.beanId ?? null);

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.paper, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="caption">Session not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header title="Shot" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
        <Text variant="title">{bean?.name ?? '—'}</Text>
        <View style={{ flexDirection: 'row', gap: t.space.md }}>
          <MetricTile label="DOSE" value={`${session.doseG.toFixed(1)} g`} />
          <MetricTile label="YIELD" value={session.yieldG != null ? `${session.yieldG.toFixed(1)} g` : '—'} />
          <MetricTile label="RATIO" value={formatRatio(brewRatio(session.doseG, session.yieldG ?? 0))} />
        </View>
        <View style={{ flexDirection: 'row', gap: t.space.md }}>
          <MetricTile label="DURATION" value={session.durationS != null ? `${session.durationS.toFixed(1)} s` : '—'} />
          <MetricTile label="RATING" value={session.rating ? '★'.repeat(session.rating) : '—'} />
        </View>

        {(milestones?.length ?? 0) > 0 ? (
          <Surface bg="paperDeep" padding="md" radius="md" bordered>
            <Text variant="heading">Milestones</Text>
            {(milestones ?? []).map((m) => (
              <View key={m.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: t.space.xs }}>
                <Text variant="body">{m.kind.replace(/_/g, ' ')}</Text>
                <Text variant="numeral">{formatElapsed(m.tSeconds * 1000)}</Text>
              </View>
            ))}
          </Surface>
        ) : null}

        {tastingNote ? (
          <Surface bg="paperDeep" padding="md" radius="md" bordered>
            <Text variant="heading">Tasting notes</Text>
            <View style={{ marginTop: t.space.sm, gap: t.space.xs }}>
              {([
                { label: 'Mouthfeel', value: tastingNote.mouthfeel },
                { label: 'Acidity', value: tastingNote.acidity },
                { label: 'Sweetness', value: tastingNote.sweetness },
                { label: 'Bitterness', value: tastingNote.bitterness },
                { label: 'Balance', value: tastingNote.balance },
              ] as const).map(({ label, value }) => (
                value != null ? (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="body">{label}</Text>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <View key={n} style={{
                          width: 8, height: 8, borderRadius: 4,
                          backgroundColor: n <= value ? t.colors.forest : t.colors.paperEdge,
                        }} />
                      ))}
                    </View>
                  </View>
                ) : null
              ))}
            </View>

            {tastingNote.flavorTags && tastingNote.flavorTags.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.xs, marginTop: t.space.sm }}>
                {tastingNote.flavorTags.map((tag) => (
                  <View key={tag} style={{
                    backgroundColor: t.colors.forestPale,
                    paddingHorizontal: t.space.sm,
                    paddingVertical: 2,
                    borderRadius: t.radii.pill,
                  }}>
                    <Text variant="caption">{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {tastingNote.comment ? (
              <Text variant="body" style={{ marginTop: t.space.sm }}>{tastingNote.comment}</Text>
            ) : null}
          </Surface>
        ) : null}

        {session.comment && !tastingNote ? (
          <Surface bg="paperDeep" padding="md" radius="md" bordered>
            <Text variant="label">NOTES</Text>
            <Text variant="body" style={{ marginTop: t.space.xs }}>{session.comment}</Text>
          </Surface>
        ) : null}

        <Pill
          label="Share"
          variant="ghost"
          onPress={async () => {
            try {
              await shareShotCard({
                beanName: bean?.name ?? '—',
                roaster: bean?.roaster ?? null,
                doseG: session.doseG,
                yieldG: session.yieldG ?? 0,
                ratio: formatRatio(brewRatio(session.doseG, session.yieldG ?? 0)),
                durationS: session.durationS ?? 0,
                rating: session.rating,
                flavorTags: tastingNote?.flavorTags ?? [],
                date: format(session.startedAt, 'MMM d, yyyy · h:mm a'),
              });
            } catch { /* user cancelled share */ }
          }}
          style={{ marginTop: t.space.sm }}
        />
        <Pill
          label="Dialing history →"
          variant="ghost"
          onPress={() => router.push(`/lab/dialing?beanId=${session.beanId}` as never)}
          style={{ marginTop: t.space.sm }}
        />
        <Pill
          label={recipe ? 'Replace recipe for this bean' : `Save as recipe for ${bean?.name ?? 'this bean'}`}
          variant="ghost"
          onPress={() =>
            router.push({
              pathname: '/(modals)/recipe-save',
              params: { sessionId: id, beanId: session.beanId },
            } as never)
          }
          style={{ marginTop: t.space.sm }}
        />
      </ScrollView>
    </View>
  );
}
