module.exports = {
  root: true,
  extends: ['expo', 'plugin:@typescript-eslint/recommended', 'prettier'],
  plugins: ['@typescript-eslint', 'prettier', 'import'],
  parser: '@typescript-eslint/parser',
  parserOptions: { project: './tsconfig.json', tsconfigRootDir: __dirname },
  settings: {
    'import/resolver': { typescript: { project: './tsconfig.json' } },
  },
  rules: {
    'prettier/prettier': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/consistent-type-imports': 'warn',
    'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
    'no-empty-pattern': 'error',
  },
  ignorePatterns: ['node_modules', '.expo', 'android', 'ios', 'dist'],
};
