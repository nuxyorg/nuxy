import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/dist-electron/**',
      '**/out/**',
      '**/release/**',
      '**/build/**',
      '**/coverage/**',
      '**/.claude/**',
      '**/.pnpm-store/**',
      '**/.vite/**',
      '**/website/docs/.vitepress/dist/**',
      '**/website/docs/.vitepress/cache/**',
      '**/reports/**',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'off', // allow short-circuit probing
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      'no-empty': 'off',
      'no-undef': 'off',
      'prefer-rest-params': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Turn off experimental/strict React 19 rules producing false positives
      'react-hooks/refs': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
      'prefer-const': 'warn',
      'no-extra-boolean-cast': 'warn',
      'no-useless-escape': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Disable React/React-Hooks rules for non-React files like tests, specs, and config files
  {
    files: [
      '**/e2e/**',
      '**/*.spec.{ts,tsx,js,jsx}',
      '**/*.test.{ts,tsx,js,jsx}',
      '**/scripts/**',
      '**/scratch/**',
      '*.config.{js,ts,mjs}',
      'src/verify-ext-settings.mjs',
    ],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  }
);
