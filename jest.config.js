module.exports = {
  preset: 'jest-expo',
  // setupFilesAfterEnv runs after Jest's test framework is installed, so `jest`,
  // `expect`, and other globals are available. Critically, this slot is empty
  // in the jest-expo preset, so our entry doesn't displace the preset's own
  // setupFiles array (which mocks RN/Expo NativeModules).
  // RNTL ≥12.4 auto-extends jest's expect with native matchers on first import.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-modules-core|@shopify/react-native-skia|react-native-svg|lucide-react-native|drizzle-orm|uuid))',
    // Mirror jest-expo's preset: prevents "Reentrant plugin detected" errors
    // once react-native-reanimated is installed (Task 31).
    '/node_modules/react-native-reanimated/plugin/',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/index.ts'],
  coverageThreshold: {
    './src/domain/**/*.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
};
