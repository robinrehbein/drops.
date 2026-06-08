import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/ui/primitives/Text';
import { colors } from '@/ui/theme/tokens';

type Props = {
  isReady: boolean;
  onHidden: () => void;
};

export function AppSplashScreen({ isReady, onHidden }: Props) {
  const containerOpacity = useSharedValue(1);
  const containerTranslateY = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.75);

  // Animate icon in on mount
  useEffect(() => {
    iconOpacity.value = withDelay(150, withTiming(1, { duration: 500 }));
    iconScale.value = withDelay(
      150,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.4)) }),
    );
  }, []);

  // Fade + slide out when app is ready
  useEffect(() => {
    if (!isReady) return;
    containerOpacity.value = withDelay(
      400,
      withTiming(0, { duration: 450, easing: Easing.in(Easing.ease) }, (done) => {
        if (done) runOnJS(onHidden)();
      }),
    );
    containerTranslateY.value = withDelay(
      400,
      withTiming(-24, { duration: 450, easing: Easing.in(Easing.ease) }),
    );
  }, [isReady]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ translateY: containerTranslateY.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, containerStyle]}>
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
        <Image source={require('../../../assets/drop-icon.png')} style={styles.icon} />
      </Animated.View>
      <Animated.View style={iconStyle}>
        <Text variant="title" style={styles.title}>
          Drops
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  iconWrap: {
    marginBottom: 20,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 20,
  },
  title: {
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
