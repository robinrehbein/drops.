import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { type IconAnimation, buildNudge, buildPop, buildPulse, buildSpin } from './animations';
import { Icon, type IconName } from './line';

type Props = {
  name: IconName;
  animation: IconAnimation;
  /** Change this value to fire the animation once (e.g. a boolean cast to number). */
  trigger: number | boolean;
  color?: string;
  size?: number;
  fill?: string;
};

/**
 * Plays a one-shot transform animation whenever `trigger` changes. Use for
 * state-change feedback (a star filling, a check appearing, a trend flipping).
 */
export function AnimatedIcon({ name, animation, trigger, color, size, fill }: Props) {
  const value = useSharedValue(animation === 'spin' || animation === 'nudge' ? 0 : 1);
  const isFirst = useSharedValue(true);

  useEffect(() => {
    if (isFirst.value) {
      isFirst.value = false;
      return;
    }
    if (animation === 'pop') value.value = buildPop();
    else if (animation === 'pulse') value.value = buildPulse();
    else if (animation === 'spin') value.value = buildSpin();
    else value.value = buildNudge();
  }, [trigger, animation, value, isFirst]);

  const style = useAnimatedStyle(() => {
    if (animation === 'spin') return { transform: [{ rotate: `${value.value}deg` }] };
    if (animation === 'nudge') return { transform: [{ translateX: value.value }] };
    return { transform: [{ scale: value.value }] };
  });

  return (
    <Animated.View style={style}>
      <Icon
        name={name}
        {...(color !== undefined ? { color } : {})}
        {...(size !== undefined ? { size } : {})}
        {...(fill !== undefined ? { fill } : {})}
      />
    </Animated.View>
  );
}
