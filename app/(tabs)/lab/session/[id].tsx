import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { useMilestones, useSession } from '@/features/brew/hooks';
import { useBean } from '@/features/beans/hooks';
import { brewRatio, formatRatio } from '@/domain/ratio';
import { formatElapsed } from '@/domain/format';
import { Header } from '@/ui/primitives/Header';
import { MetricTile } from '@/ui/primitives/MetricTile';
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
                <Text variant="body">{m.kind.replace('_', ' ')}</Text>
                <Text variant="numeral">{formatElapsed(m.tSeconds * 1000)}</Text>
              </View>
            ))}
          </Surface>
        ) : null}

        {session.comment ? (
          <Surface bg="paperDeep" padding="md" radius="md" bordered>
            <Text variant="label">NOTES</Text>
            <Text variant="body" style={{ marginTop: t.space.xs }}>{session.comment}</Text>
          </Surface>
        ) : null}
      </ScrollView>
    </View>
  );
}
