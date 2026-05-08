module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['@testing-library/jest-native/extend-expect'],
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
