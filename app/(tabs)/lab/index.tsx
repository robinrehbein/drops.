import { useEffect, useRef } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useBeans } from '@/features/beans/hooks';
import {
  useStartSession,
  useEndSession,
  useAddMilestone,
  useLastShotForBean,
} from '@/features/brew/hooks';
import { useRecipeForBean } from '@/features/recipes/hooks';
import { useDialingAdvice } from '@/features/dialing/hooks';
import { RecoveryBanner } from '@/features/brew/RecoveryBanner';
import { useBrewStore } from '@/features/brew/store';
import { extractionPercent } from '@/domain/extraction';
import { nudgeGrind } from '@/domain/dialing';
import { Icon } from '@/ui/icons/line';
import { CoachCard } from '@/ui/primitives/CoachCard';
import { ExtractionRing } from '@/ui/primitives/ExtractionRing';
import { Header } from '@/ui/primitives/Header';
import { MetricTile } from '@/ui/primitives/MetricTile';
import { Pill } from '@/ui/primitives/Pill';
import { Stepper } from '@/ui/primitives/Stepper';
import { Text } from '@/ui/primitives/Text';
import { TimerDisplay } from '@/ui/primitives/TimerDisplay';
import { useTheme } from '@/ui/theme/useTheme';

export default function LabIndex() {
  const t = useTheme();
  const router = useRouter();
  const { data: beans } = useBeans();

  const status = useBrewStore((s) => s.status);
  const draft = useBrewStore((s) => s.draft);
  const session = useBrewStore((s) => s.session);
  const send = useBrewStore((s) => s.send);

  const startSession = useStartSession();
  const addMilestone = useAddMilestone();
  const endSession = useEndSession();

  // Recipe pre-fill: prefer saved recipe, fall back to last shot recall
  const { data: recipe } = useRecipeForBean(draft.beanId ?? null);
  const { data: lastShot } = useLastShotForBean(draft.beanId);
  const prevBeanId = useRef(draft.beanId);
  useEffect(() => {
    if (draft.beanId && draft.beanId !== prevBeanId.current) {
      if (recipe) {
        send({
          type: 'configure',
          doseG: recipe.doseG ?? draft.doseG,
          targetYieldG: recipe.targetYieldG ?? draft.targetYieldG,
          grindSetting: recipe.grindSetting,
          grinderLabel: recipe.grinderLabel,
          waterTempC: recipe.waterTempC,
        });
      } else if (lastShot) {
        send({
          type: 'configure',
          doseG: lastShot.doseG,
          targetYieldG: lastShot.yieldG ?? draft.targetYieldG,
          grindSetting: lastShot.grindSetting,
          grinderLabel: lastShot.grinderLabel,
          waterTempC: lastShot.waterTempC,
        });
      }
    }
    prevBeanId.current = draft.beanId;
  }, [draft.beanId, recipe]);

  // Keep screen awake while pulling (imperative API — a hook must not be called conditionally)
  useEffect(() => {
    if (status !== 'Pulling') return undefined;
    void activateKeepAwakeAsync('drop-pulling');
    return () => {
      void deactivateKeepAwake('drop-pulling');
    };
  }, [status]);

  const selectedBean = beans?.find((b) => b.id === draft.beanId) ?? null;

  const { advice } = useDialingAdvice(draft.beanId);

  const repeatLastShot = () => {
    if (!lastShot) return;
    send({
      type: 'configure',
      doseG: lastShot.doseG,
      targetYieldG: lastShot.yieldG ?? draft.targetYieldG,
      grindSetting: lastShot.grindSetting,
      grinderLabel: lastShot.grinderLabel,
      waterTempC: lastShot.waterTempC,
    });
  };

  const applyNudge = () => {
    const next = nudgeGrind(draft.grindSetting, advice);
    if (next !== draft.grindSetting) send({ type: 'configure', grindSetting: next });
  };

  const grindIsNumeric =
    draft.grindSetting != null &&
    draft.grindSetting.trim() !== '' &&
    Number.isFinite(Number(draft.grindSetting));
  const showNudge =
    grindIsNumeric &&
    (advice?.primary.lever === 'grind-finer' || advice?.primary.lever === 'grind-coarser');
  const nudgeDir = advice?.primary.lever === 'grind-finer' ? 'finer' : 'coarser';
  const nudgeSteps = advice?.primary.magnitude === 'medium' ? 2 : 1;

  const onStart = async () => {
    if (!selectedBean) return;
    const persisted = await startSession.mutateAsync({
      beanId: selectedBean.id,
      doseG: draft.doseG,
      grindSetting: draft.grindSetting,
    });
    send({ type: 'start', at: persisted.startedAt, sessionId: persisted.id });
  };

  const onMilestone = async (kind: 'pre_infusion_end' | 'first_drop') => {
    if (!session) return;
    const tSeconds = (Date.now() - session.startedAt.getTime()) / 1000;
    await addMilestone.mutateAsync({ sessionId: session.id, kind, tSeconds });
    send({ type: 'milestone', kind, tSeconds });
  };

  const onStop = async () => {
    if (!session) return;
    const at = new Date();
    const durationS = (at.getTime() - session.startedAt.getTime()) / 1000;
    await endSession.mutateAsync({
      id: session.id,
      args: { endedAt: at, yieldG: draft.targetYieldG, durationS },
    });
    send({ type: 'stop', at });
    router.push('/(modals)/tasting-note' as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
      <Header
        title="Brew Lab"
        rightLabel="History"
        onRightPress={() => router.push('/lab/history' as never)}
      />
      <RecoveryBanner />
      <View style={{ padding: t.space.lg, flex: 1 }}>
        <Pressable onPress={() => router.push('/(modals)/pick-bean' as never)}>
          <View
            style={{
              backgroundColor: t.colors.paperDeep,
              padding: t.space.md,
              borderRadius: t.radii.pill,
              alignSelf: 'flex-start',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.xs }}>
              <Text variant="bodyStrong" color={t.colors.forest}>
                {selectedBean ? `Brewing with: ${selectedBean.name}` : 'Pick a bean'}
              </Text>
              <Icon name="chevronDown" size={16} color={t.colors.forest} />
            </View>
          </View>
        </Pressable>
        {recipe && selectedBean ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.xs, marginTop: t.space.xs }}>
            <Icon name="star" size={14} color={t.colors.forest} fill={t.colors.forest} />
            <Text variant="caption" color={t.colors.forest}>Recipe locked</Text>
          </View>
        ) : null}

        {status === 'IdleSetup' ? (
          <View style={{ marginTop: t.space.xl, gap: t.space.lg }}>
            <CoachCard advice={advice}>
              {lastShot ? (
                <View style={{ flexDirection: 'row', gap: t.space.sm, flexWrap: 'wrap' }}>
                  <Pill label="Repeat last shot" variant="ghost" onPress={repeatLastShot} />
                  {showNudge ? (
                    <Pill
                      label={`${nudgeDir} (${advice!.primary.lever === 'grind-finer' ? '−' : '+'}${nudgeSteps})`}
                      variant="primary"
                      onPress={applyNudge}
                    />
                  ) : null}
                </View>
              ) : null}
            </CoachCard>
            <Stepper
              label="Dose"
              unit="g"
              min={5}
              max={30}
              step={0.1}
              value={draft.doseG}
              onChange={(v) => send({ type: 'configure', doseG: v })}
            />
            <Stepper
              label="Target yield"
              unit="g"
              min={5}
              max={80}
              step={0.5}
              value={draft.targetYieldG}
              onChange={(v) => send({ type: 'configure', targetYieldG: v })}
            />
            <Pill label="Start Shot" size="lg" onPress={onStart} disabled={!selectedBean} />
          </View>
        ) : status === 'Pulling' && session ? (
          <View style={{ marginTop: t.space.xl, alignItems: 'center', gap: t.space.lg }}>
            <TimerDisplay startedAtMs={session.startedAt.getTime()} />
            <ExtractionRing
              size={220}
              progress={extractionPercent(session.doseG, draft.targetYieldG) ?? 0}
              centerLabel={`${Math.round((extractionPercent(session.doseG, draft.targetYieldG) ?? 0) * 100)}%`}
              caption="EXTRACTION"
            />
            <View style={{ flexDirection: 'row', gap: t.space.md }}>
              <MetricTile label="DOSE" value={`${session.doseG.toFixed(1)} g`} />
              <MetricTile label="TARGET" value={`${draft.targetYieldG.toFixed(1)} g`} />
            </View>
            <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.lg }}>
              <Pill
                variant="ghost"
                label="Pre-infusion end"
                onPress={() => onMilestone('pre_infusion_end')}
              />
              <Pill variant="ghost" label="First drop" onPress={() => onMilestone('first_drop')} />
            </View>
            <Pill variant="danger" size="lg" label="Stop Pull" onPress={onStop} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
