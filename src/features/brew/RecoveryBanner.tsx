import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useDiscardSession, useInProgressSession } from './hooks';
import { useBrewStore } from './store';
import { useTheme } from '@/ui/theme/useTheme';
import { Pill } from '@/ui/primitives/Pill';
import { Text } from '@/ui/primitives/Text';
import { secondsBetween } from '@/domain/time';

export function RecoveryBanner() {
  const t = useTheme();
  const { data: inProgress } = useInProgressSession();
  const send = useBrewStore((s) => s.send);
  const discard = useDiscardSession();
  const status = useBrewStore((s) => s.status);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => setDismissed(false), [inProgress?.id]);

  if (!inProgress || dismissed || status !== 'IdleSetup') return null;

  const ageS = secondsBetween(inProgress.startedAt.getTime(), Date.now());

  const onResume = () => {
    send({
      type: 'recoverFromDb',
      session: {
        id: inProgress.id,
        beanId: inProgress.beanId,
        method: 'espresso',
        doseG: inProgress.doseG,
        startedAt: inProgress.startedAt,
        endedAt: null,
        durationS: null,
        preInfusionS: inProgress.preInfusionS,
        firstDropS: inProgress.firstDropS,
        yieldG: null,
        rating: null,
        comment: null,
        grinderLabel: inProgress.grinderLabel,
        grindSetting: inProgress.grindSetting,
        waterTempC: inProgress.waterTempC,
        milestones: [],
      },
    });
  };

  const onDiscard = async () => {
    await discard.mutateAsync(inProgress.id);
    setDismissed(true);
  };

  return (
    <View
      style={{
        backgroundColor: t.colors.amber,
        marginHorizontal: t.space.lg, marginTop: t.space.md,
        padding: t.space.md, borderRadius: t.radii.md,
        flexDirection: 'row', alignItems: 'center', gap: t.space.md,
      }}
    >
      <Text variant="body" color={t.colors.paper} style={{ flex: 1 }}>
        In-progress shot from {Math.round(ageS)}s ago.
      </Text>
      <Pill label="Resume" onPress={onResume} />
      <Pressable onPress={onDiscard} accessibilityRole="button" accessibilityLabel="Discard">
        <Text variant="bodyStrong" color={t.colors.paper}>Discard</Text>
      </Pressable>
    </View>
  );
}
