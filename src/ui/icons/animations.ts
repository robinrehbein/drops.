import { useCallback } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const SPRING = { damping: 12, stiffness: 220 } as const;

/**
 * Press feedback for any Pressable: scale down on press-in, spring back on
 * release. Spread the returned handlers onto the Pressable and the returned
 * style onto a wrapping Animated.View.
 */
export function usePressAnimation(pressedScale = 0.88) {
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    scale.value = withTiming(pressedScale, { duration: 80 });
  }, [pressedScale, scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING);
  }, [scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return { style, onPressIn, onPressOut };
}

export type IconAnimation = 'pop' | 'pulse' | 'spin' | 'nudge';

/** withSequence builders kept here so AnimatedIcon and tests share one source. */
export const buildPop = () =>
  withSequence(withSpring(1.35, { damping: 6, stiffness: 260 }), withSpring(1, SPRING));
export const buildPulse = () =>
  withSequence(withTiming(1.15, { duration: 120 }), withTiming(1, { duration: 120 }));
export const buildSpin = () => withTiming(360, { duration: 400 });
export const buildNudge = () =>
  withSequence(withTiming(4, { duration: 80 }), withSpring(0, SPRING));
