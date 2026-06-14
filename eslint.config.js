import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import litPlugin from 'eslint-plugin-lit'
import wcPlugin from 'eslint-plugin-wc'
import globals from 'globals'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  litPlugin.configs['flat/recommended'],
  wcPlugin.configs['flat/recommended'],
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
      'extensions/ui-default/frontend.js',
    ],
  },
  {
    files: ['**/*.{js,ts,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
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
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
      'prefer-const': 'warn',
      'no-extra-boolean-cast': 'warn',
      'no-useless-escape': 'warn',
    },
    settings: {
      wc: {
        elementBaseClasses: ['LitElement'],
      },
    },
  }
)
