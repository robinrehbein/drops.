import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, TextInput } from 'react-native';
import { useState } from 'react';

import { useBeans } from '@/features/beans/hooks';
import { useBrewStore } from '@/features/brew/store';
import { BeanCard } from '@/ui/primitives/BeanCard';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export default function PickBean() {
  const { backTo } = useLocalSearchParams<{ backTo?: string }>();
  const router = useRouter();
  const t = useTheme();
  const { data } = useBeans();
  const send = useBrewStore((s) => s.send);
  const [q, setQ] = useState('');

  const filtered = (data ?? []).filter((b) => b.name.toLowerCase().includes(q.toLowerCase()));

  const choose = (id: string) => {
    send({ type: 'configure', beanId: id });
    if (backTo) router.replace(backTo as never);
    else router.back();
  };

  return (
    <Sheet>
      <Text variant="title" style={{ marginBottom: t.space.md }}>
        Pick a bean
      </Text>
      <TextInput
        placeholder="Search beans…"
        placeholderTextColor={t.colors.inkFaint}
        value={q}
        onChangeText={setQ}
        style={{
          borderWidth: 1,
          borderColor: t.colors.paperEdge,
          backgroundColor: t.colors.paperDeep,
          padding: t.space.md,
          borderRadius: t.radii.md,
          fontFamily: t.fonts.sans,
          color: t.colors.ink,
          marginBottom: t.space.md,
        }}
      />
      <ScrollView contentContainerStyle={{ gap: t.space.md, paddingBottom: t.space.xl }}>
        {filtered.length === 0 ? (
          <EmptyState
            title="No matches"
            body="Try a different search or add a new bean."
            cta={{ label: 'Add a bean', onPress: () => router.replace('/library/new' as never) }}
          />
        ) : (
          filtered.map((b) => (
            <Pressable key={b.id} onPress={() => choose(b.id)}>
              <BeanCard
                name={b.name}
                subtitle={[b.origin, b.process].filter(Boolean).join(' · ')}
                roastedOn={b.roastedOn ?? null}
              />
            </Pressable>
          ))
        )}
      </ScrollView>
    </Sheet>
  );
}
