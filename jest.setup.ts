// Silence noisy logs in unit tests; per-test code may override.
jest.spyOn(console, 'error').mockImplementation(() => undefined);

// Reanimated's Jest implementation runs animation worklets on the JS thread.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('react-native-reanimated').setUpTests();

// expo-font's useFonts never resolves in jest because the native font loader is
// stubbed without driving the load promise. ThemeProvider would render a blank
// <View /> forever, hiding children from RNTL queries. Stubbing useFonts to
// return [true, null] lets components mount synchronously in unit tests.
jest.mock('expo-font', () => {
  const actual = jest.requireActual('expo-font');
  return {
    ...actual,
    useFonts: () => [true, null],
  };
});

// Screens read safe-area insets (e.g. ExploreScreen, Header) but tests don't
// mount a SafeAreaProvider, so the real useSafeAreaInsets throws. Return zero
// insets — layout math degrades gracefully and queries still find content.
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

import '@/i18n';
