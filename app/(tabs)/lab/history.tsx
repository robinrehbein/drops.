import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { format, formatRelative } from 'date-fns';

import { useSessions } from '@/features/brew/hooks';
import { useBeans } from '@/features/beans/hooks';
import { brewRatio, formatRatio } from '@/domain/ratio';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { Header } from '@/ui/primitives/Header';
import { Surface } from '@/ui/primitives/Surface';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export default function LabHistory() {
  const t = useTheme();
  const router = useRouter();
  const { data: sessions } = useSessions();
  const { data: beans } = useBeans();

  const beanName = (id: string) => beans?.find((b) => b.id === id)?.name ?? '—';

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header title="History" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
        {!sessions || sessions.length === 0 ? (
          <EmptyState title="No shots yet" body="Pull your first espresso to start your history." />
        ) : (
          sessions.map((s) => (
            <Pressable key={s.id} onPress={() => router.push(`/lab/session/${s.id}` as never)}>
              <Surface bg="paperDeep" radius="md" padding="md" bordered>
                <Text variant="heading">{beanName(s.beanId)}</Text>
                <Text variant="caption" style={{ marginTop: 2 }}>
                  {format(s.startedAt, 'h:mm a')} · {formatRelative(s.startedAt, new Date())}
                </Text>
                <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
                  <Text variant="numeral">{s.durationS?.toFixed(1)}s</Text>
                  <Text variant="numeral">{formatRatio(brewRatio(s.doseG, s.yieldG ?? 0))}</Text>
                  {s.rating ? <Text variant="numeral">{'★'.repeat(s.rating)}</Text> : null}
                </View>
              </Surface>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
