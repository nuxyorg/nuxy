import { defineConfig } from 'eslint/config'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import litPlugin from 'eslint-plugin-lit'
import wcPlugin from 'eslint-plugin-wc'
import globals from 'globals'

/** Files where imperative DOM is inherent (see rules/EXTENSION_GUIDE.md §5.13). */
const DOM_MANIPULATION_IGNORES = [
  '**/*.test.ts',
  '**/tests/**',
  '**/render-markdown.ts',
  '**/nuxy-tool-host.ts',
  '**/nuxy-portal.ts',
  '**/scroll-into-view.ts',
  '**/list-indicator.ts',
  '**/gradient/gradient.ts',
]

export default defineConfig(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  litPlugin.configs['flat/recommended'],
  wcPlugin.configs['flat/recommended'],
  {
    ignores: [
      'scratch.js',
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
      '**/playwright-report/**',
      'extensions/ui-default/frontend.js',
    ],
  },
  {
    files: ['extensions/**/*.ts'],
    ignores: DOM_MANIPULATION_IGNORES,
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'AssignmentExpression[left.property.name="innerHTML"]',
          message: 'Avoid .innerHTML assignment — use Lit html`` templates and <slot> instead.',
        },
        {
          selector: 'AssignmentExpression[left.property.name="outerHTML"]',
          message: 'Avoid .outerHTML assignment — use Lit html`` templates instead.',
        },
        {
          selector:
            'CallExpression[callee.object.name="document"][callee.property.name="createElement"]',
          message: 'Avoid document.createElement in Lit components — use html`` templates instead.',
        },
        {
          selector:
            'CallExpression[callee.object.object.name="document"][callee.object.property.name="body"][callee.property.name="appendChild"]',
          message: 'Avoid document.body.appendChild — use <nuxy-portal> for body-mounted overlays.',
        },
        {
          selector: 'CallExpression[callee.property.name="insertAdjacentHTML"]',
          message: 'Avoid insertAdjacentHTML — use Lit html`` templates instead.',
        },
        {
          selector: 'CallExpression[callee.property.name="replaceChildren"]',
          message: 'Avoid replaceChildren in Lit components — return html`` from render() instead.',
        },
        {
          selector: 'CallExpression[callee.property.name=/^querySelector(All)?$/]',
          message:
            'Avoid querySelector in component code — use @query, ref(), or Lit templates instead.',
        },
        {
          selector:
            'CallExpression[callee.property.name="appendChild"][callee.object.type="ThisExpression"]',
          message: 'Avoid this.appendChild in Lit components — use html`` templates instead.',
        },
      ],
    },
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
