import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { useBean, useRestoreBean, useSoftDeleteBean } from '@/features/beans/hooks';
import { useSessions } from '@/features/brew/hooks';
import { useSnackbarStore } from '@/state/snackbar';
import { BeanCard } from '@/ui/primitives/BeanCard';
import { Header } from '@/ui/primitives/Header';
import { Pill } from '@/ui/primitives/Pill';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export default function BeanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const { data: bean } = useBean(id ?? '');
  const { data: sessions } = useSessions(id);
  const softDelete = useSoftDeleteBean();
  const restore = useRestoreBean();
  const show = useSnackbarStore((s) => s.show);

  if (!bean) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.paper, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="caption">Bean not found</Text>
      </View>
    );
  }

  const remainingPct =
    bean.startWeightG && bean.remainingWeightG != null
      ? (bean.remainingWeightG / bean.startWeightG) * 100
      : null;

  const onDelete = async () => {
    await softDelete.mutateAsync(bean.id);
    show('Bean deleted', { label: 'Undo', onPress: () => restore.mutate(bean.id) });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header title="Bean" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}>
        <BeanCard
          name={bean.name}
          subtitle={[bean.origin, bean.process].filter(Boolean).join(' · ')}
          roastedOn={bean.roastedOn ?? null}
          remainingPct={remainingPct}
        />
        <View style={{ marginTop: t.space.lg }}>
          <Text variant="heading">History with this bean</Text>
          <Text variant="caption" style={{ marginTop: t.space.xs }}>
            {sessions?.length ?? 0} {sessions?.length === 1 ? 'shot' : 'shots'}
          </Text>
        </View>
        <Pill label="Delete bean" variant="danger" onPress={onDelete} />
      </ScrollView>
    </View>
  );
}
