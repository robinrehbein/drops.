module.exports = {
  preset: 'jest-expo',
  // RNTL ≥12.4 auto-extends jest's expect with native matchers on first import.
  setupFiles: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-modules-core|@shopify/react-native-skia|drizzle-orm))',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/index.ts'],
  coverageThreshold: {
    './src/domain/**/*.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
};
