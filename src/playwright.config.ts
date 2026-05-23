import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '..', // monorepo root — testMatch narrows which files are picked up
  testMatch: ['src/e2e/**/*.spec.ts', 'extensions/**/e2e.spec.ts'],
  timeout: 5000,
  expect: {
    timeout: 400,
  },
  retries: 0,
  workers: 1, // Electron tests must run serially — one app instance at a time
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    trace: 'retain-on-failure',
    actionTimeout: 400,
    navigationTimeout: 2000,
  },
})
