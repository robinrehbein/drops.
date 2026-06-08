import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useBeans } from '@/features/beans/hooks';
import { useSessions } from '@/features/brew/hooks';
import { useOnboardingStore } from '@/state/onboarding';
import { Icon, type IconName } from '@/ui/icons/line';
import { Pill } from '@/ui/primitives/Pill';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

const STEPS = [
  {
    icon: 'cup' as IconName,
    title: 'Welcome to Drops',
    body: 'Your private espresso journal.\nNo accounts. No cloud. Just coffee.',
    cta: 'Get started',
  },
  {
    icon: 'bean' as IconName,
    title: 'Start your library',
    body: 'Add a bag of beans to start logging your espresso shots.',
    cta: 'Add a bean',
    route: '/library/new' as const,
    skip: true,
  },
  {
    icon: 'flask' as IconName,
    title: 'Ready to brew?',
    body: 'Head to the Lab to pull your first espresso shot.',
    cta: 'Open Brew Lab',
    route: '/lab' as const,
    skip: true,
  },
] as const;

export function OnboardingScreen() {
  const t = useTheme();
  const step = useOnboardingStore((s) => s.step);
  const setStep = useOnboardingStore((s) => s.setStep);
  const complete = useOnboardingStore((s) => s.complete);
  const { data: beans } = useBeans();
  const { data: sessions } = useSessions();

  // Animation values for step transitions
  const contentOpacity = useSharedValue(1);
  const contentTranslateX = useSharedValue(0);
  const prevStep = useRef(step);

  // Auto-advance when data appears
  useEffect(() => {
    if (step === 1 && beans && beans.length > 0) setStep(2);
  }, [beans, step]);

  useEffect(() => {
    if (step === 2 && sessions && sessions.length > 0) complete();
  }, [sessions, step]);

  // Animate on step change: slide out left, then in from right
  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;

    // Slide out to left + fade
    contentOpacity.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.ease) });
    contentTranslateX.value = withTiming(-32, { duration: 180, easing: Easing.in(Easing.ease) });

    // Slide in from right + fade after brief pause
    setTimeout(() => {
      contentTranslateX.value = 32;
      contentOpacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.ease) });
      contentTranslateX.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.ease) });
    }, 190);
  }, [step]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateX: contentTranslateX.value }],
  }));

  const current = STEPS[step] ?? STEPS[0]!;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.colors.paper,
        alignItems: 'center',
        justifyContent: 'center',
        padding: t.space.xl,
      }}
    >
      <Animated.View style={[{ alignItems: 'center' }, contentStyle]}>
        <Icon name={current.icon} size={64} color={t.colors.forest} />
        <Text variant="title" style={{ marginTop: t.space.xl, textAlign: 'center' }}>
          {current.title}
        </Text>
        <Text
          variant="body"
          style={{ marginTop: t.space.md, textAlign: 'center', color: t.colors.inkSoft }}
        >
          {current.body}
        </Text>
      </Animated.View>

      <View style={{ marginTop: 48, width: '100%', alignItems: 'center', gap: t.space.md }}>
        <Pill
          label={current.cta}
          rightIcon="arrowRight"
          size="lg"
          onPress={() => {
            if (step === 0) setStep(1);
            else if (step === STEPS.length - 1) complete();
            else setStep(step + 1);
          }}
          style={{ minWidth: 200 }}
        />
        {'skip' in current && current.skip ? (
          <Pill label="Skip" variant="ghost" onPress={complete} />
        ) : null}
      </View>

      {/* Step indicators */}
      <View style={{ flexDirection: 'row', gap: t.space.sm, marginTop: 48 }}>
        {STEPS.map((_, i) => (
          <Animated.View
            key={i}
            style={{
              width: i === step ? 20 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === step ? t.colors.forest : t.colors.paperEdge,
            }}
          />
        ))}
      </View>
    </View>
  );
}
