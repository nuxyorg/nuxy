import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '..', // monorepo root — testMatch narrows which files are picked up
  testMatch: ['src/e2e/**/*.spec.ts', 'extensions/**/e2e.spec.ts'],
  timeout: 60_000,
  retries: 0,
  workers: 1, // Electron tests must run serially — one app instance at a time
  use: {
    trace: 'on-first-retry',
  },
})
