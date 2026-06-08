import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '..', // monorepo root — testMatch narrows which files are picked up
  testMatch: ['src/e2e/**/*.spec.ts', 'extensions/**/e2e.spec.ts'],
  testIgnore: ['**/.claude/**', '**/release/**'],
  timeout: 20000,
  expect: {
    timeout: 2000,
  },
  retries: 0,
  maxFailures: 1,
  workers: process.env.PLAYWRIGHT_WORKERS ? parseInt(process.env.PLAYWRIGHT_WORKERS, 10) : 8,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    trace: 'retain-on-failure',
    actionTimeout: 2000,
    navigationTimeout: 5000,
  },
})
