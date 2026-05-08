import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';

import { useSessions } from '@/features/brew/hooks';
import { useBeans } from '@/features/beans/hooks';
import { brewRatio, formatRatio } from '@/domain/ratio';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { Header } from '@/ui/primitives/Header';
import { Pill } from '@/ui/primitives/Pill';
import { Surface } from '@/ui/primitives/Surface';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

type SessionList = NonNullable<ReturnType<typeof useSessions>['data']>;

type DayGroup = {
  key: string;
  label: string;
  sessions: SessionList[number][];
};

function groupByDay(sessions: SessionList): DayGroup[] {
  const groups = new Map<string, SessionList>();

  for (const s of sessions) {
    const day = startOfDay(s.startedAt).toISOString();
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(s);
  }

  return Array.from(groups.entries()).map(([day, items]) => {
    const date = new Date(day);
    let label: string;
    if (isToday(date)) label = 'Today';
    else if (isYesterday(date)) label = 'Yesterday';
    else label = format(date, 'EEEE, MMM d');
    return { key: day, label, sessions: items };
  });
}

export default function LabHistory() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ beanFilter?: string }>();
  const [filterBeanId, setFilterBeanId] = useState<string | null>(params.beanFilter ?? null);
  const { data: sessions } = useSessions();
  const { data: beans } = useBeans();

  const beanName = (id: string) => beans?.find((b) => b.id === id)?.name ?? '—';

  // C2: Bean filter
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    if (!filterBeanId) return sessions;
    return sessions.filter((s) => s.beanId === filterBeanId);
  }, [sessions, filterBeanId]);

  const groups = groupByDay(filteredSessions);

  // C5: Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // invalidate by re-query — TanStack Query will refetch on next mount
    // For now, just stop refreshing since queries auto-refetch
    setRefreshing(false);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header title="History" onBack={() => router.back()} />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.forest} />}
        contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}
      >
        {/* C2: Bean filter chips */}
        {beans && beans.length > 1 && sessions && sessions.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: t.space.sm, paddingBottom: t.space.sm }}>
            <Pill
              label="All"
              variant={filterBeanId === null ? 'primary' : 'ghost'}
              onPress={() => setFilterBeanId(null)}
            />
            {beans.map((b) => (
              <Pill
                key={b.id}
                label={b.name}
                variant={filterBeanId === b.id ? 'primary' : 'ghost'}
                onPress={() => setFilterBeanId(filterBeanId === b.id ? null : b.id)}
              />
            ))}
          </ScrollView>
        ) : null}

        {filteredSessions.length === 0 ? (
          filterBeanId ? (
            <EmptyState title="No shots with this bean" body="Try selecting a different bean or pulling your first shot." />
          ) : (
            <EmptyState title="No shots yet" body="Pull your first espresso to start your history." />
          )
        ) : (
          groups.map((g) => (
            <View key={g.key}>
              <Text variant="label" style={{ marginTop: t.space.sm, marginBottom: t.space.xs }}>
                {g.label}
              </Text>
              {g.sessions.map((s) => (
                <Pressable key={s.id} onPress={() => router.push(`/lab/session/${s.id}` as never)}>
                  <Surface bg="paperDeep" radius="md" padding="md" bordered style={{ marginBottom: t.space.sm }}>
                    <Text variant="heading">{beanName(s.beanId)}</Text>
                    <Text variant="caption" style={{ marginTop: 2 }}>
                      {format(s.startedAt, 'h:mm a')}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
                      <Text variant="numeral">{s.durationS?.toFixed(1)}s</Text>
                      <Text variant="numeral">{formatRatio(brewRatio(s.doseG, s.yieldG ?? 0))}</Text>
                      {s.rating ? <Text variant="numeral">{'★'.repeat(s.rating)}</Text> : null}
                    </View>
                  </Surface>
                </Pressable>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
