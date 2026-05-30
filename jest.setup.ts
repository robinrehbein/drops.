// Silence noisy logs in unit tests; per-test code may override.
jest.spyOn(console, 'error').mockImplementation(() => undefined);

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

import '@/i18n';
