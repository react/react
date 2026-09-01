import {defineConfig} from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';

export default defineConfig([
  reactHooks.configs.flat['recommended-latest'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'react-hooks/exhaustive-deps': 'error',
    },
  },
]);
