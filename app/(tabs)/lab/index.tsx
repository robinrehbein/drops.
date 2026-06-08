import { useEffect, useRef, useState } from 'react';
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
import { useRecipeForBean, useRecipesForBean } from '@/features/recipes/hooks';
import type { RecipeRow } from '@/features/recipes/types';
import { useDialingAdvice } from '@/features/dialing/hooks';
import { RecoveryBanner } from '@/features/brew/RecoveryBanner';
import { useBrewStore } from '@/features/brew/store';
import { nudgeGrind } from '@/domain/dialing';
import { recipeLabel } from '@/domain/recipe-label';
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

  // Recipe pre-fill: prefer the bean's default recipe, fall back to last shot.
  // The full list powers the recipe picker chips so a non-default can be chosen.
  const { data: recipe } = useRecipeForBean(draft.beanId ?? null);
  const { data: beanRecipes = [] } = useRecipesForBean(draft.beanId ?? null);
  const { data: lastShot } = useLastShotForBean(draft.beanId);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  const applyRecipe = (r: RecipeRow) => {
    send({
      type: 'configure',
      doseG: r.doseG ?? draft.doseG,
      targetYieldG: r.targetYieldG ?? draft.targetYieldG,
      grindSetting: r.grindSetting,
      grinderLabel: r.grinderLabel,
      waterTempC: r.waterTempC,
    });
    setSelectedRecipeId(r.id);
  };

  const prevBeanId = useRef(draft.beanId);
  useEffect(() => {
    if (draft.beanId && draft.beanId !== prevBeanId.current) {
      if (recipe) {
        applyRecipe(recipe);
      } else if (lastShot) {
        send({
          type: 'configure',
          doseG: lastShot.doseG,
          targetYieldG: lastShot.yieldG ?? draft.targetYieldG,
          grindSetting: lastShot.grindSetting,
          grinderLabel: lastShot.grinderLabel,
          waterTempC: lastShot.waterTempC,
        });
        setSelectedRecipeId(null);
      }
    }
    prevBeanId.current = draft.beanId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Live shot clock driving the progress ring — ticks only while pulling. No
  // scale is connected, so the ring tracks elapsed time toward the target shot
  // time (recipe's target, else a 30s default) rather than a measured yield.
  const TARGET_SHOT_S = 30;
  const targetShotS = recipe?.durationTargetS ?? TARGET_SHOT_S;
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (status !== 'Pulling') return undefined;
    const id = setInterval(() => setNowMs(Date.now()), 100);
    return () => clearInterval(id);
  }, [status]);
  const elapsedS = session ? Math.max(0, (nowMs - session.startedAt.getTime()) / 1000) : 0;
  const shotProgress = targetShotS > 0 ? Math.min(1, elapsedS / targetShotS) : 0;

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
        {status === 'IdleSetup' && selectedBean && beanRecipes.length > 0 ? (
          <View style={{ marginTop: t.space.md }}>
            <Text variant="label">RECIPE</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, marginTop: t.space.xs }}>
              {beanRecipes.map((r) => (
                <Pill
                  key={r.id}
                  label={r.name?.trim() ? r.name.trim() : recipeLabel(r)}
                  variant={selectedRecipeId === r.id ? 'primary' : 'ghost'}
                  onPress={() => applyRecipe(r)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedRecipeId === r.id }}
                />
              ))}
              <Pill
                label="None"
                variant={selectedRecipeId === null ? 'primary' : 'ghost'}
                onPress={() => setSelectedRecipeId(null)}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedRecipeId === null }}
              />
            </View>
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
              progress={shotProgress}
              centerLabel={`${Math.round(shotProgress * 100)}%`}
              caption={`OF ${Math.round(targetShotS)}s`}
              band={elapsedS > targetShotS ? 'over' : 'balanced'}
            />
            <View style={{ flexDirection: 'row', gap: t.space.md }}>
              <MetricTile label="DOSE" value={`${session.doseG.toFixed(1)} g`} />
              <MetricTile label="TARGET" value={`${draft.targetYieldG.toFixed(1)} g`} />
            </View>
            <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.lg }}>
              <Pill
                variant={session.preInfusionS != null ? 'primary' : 'ghost'}
                label={
                  session.preInfusionS != null
                    ? `Pre-infusion ${session.preInfusionS.toFixed(1)}s`
                    : 'Pre-infusion end'
                }
                onPress={() => onMilestone('pre_infusion_end')}
                disabled={session.preInfusionS != null}
              />
              <Pill
                variant={session.firstDropS != null ? 'primary' : 'ghost'}
                label={
                  session.firstDropS != null
                    ? `First drop ${session.firstDropS.toFixed(1)}s`
                    : 'First drop'
                }
                onPress={() => onMilestone('first_drop')}
                disabled={session.firstDropS != null}
              />
            </View>
            <Pill variant="danger" size="lg" label="Stop Pull" onPress={onStop} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
