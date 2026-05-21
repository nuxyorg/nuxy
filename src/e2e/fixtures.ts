import { test as base, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..', '..')
const APP_DIR = resolve(__dirname, '..')

function findElectronBin(): string {
  const bin = execSync(
    `find "${PROJECT_ROOT}/node_modules/.pnpm" -name "electron" -path "*/dist/electron" -type f 2>/dev/null | head -1`,
  )
    .toString()
    .trim()
  if (!bin) throw new Error('Could not locate electron binary in pnpm store')
  return bin
}

const ELECTRON_BIN = findElectronBin()

async function launchApp(userDataDir: string): Promise<ElectronApplication> {
  // Use a unique user-data-dir so Electron's requestSingleInstanceLock
  // doesn't conflict with any running nuxy instance on the developer's machine.
  return electron.launch({
    executablePath: ELECTRON_BIN,
    args: ['--no-sandbox', `--user-data-dir=${userDataDir}`, APP_DIR],
    env: {
      ...process.env,
      DISPLAY: process.env.DISPLAY ?? ':0',
      ELECTRON_OZONE_PLATFORM_HINT: 'x11',
    },
    timeout: 30_000,
  })
}

async function getAppPage(app: ElectronApplication): Promise<Page> {
  // Give the app time to boot and load extensions
  await new Promise<void>((r) => setTimeout(r, 6000))
  const windows = app.windows()
  return windows.find((w) => !w.url().startsWith('devtools://')) ?? (await app.firstWindow())
}

type ElectronWorkerFixtures = {
  electronApp: ElectronApplication
  appPage: Page
}

export const test = base.extend<{}, ElectronWorkerFixtures>({
  // scope: 'worker' — one Electron instance shared across all tests in the worker
  electronApp: [
    async ({}, use) => {
      const userDataDir = mkdtempSync(resolve(tmpdir(), 'nuxy-test-'))
      let app: ElectronApplication | undefined
      try {
        app = await launchApp(userDataDir)
        await use(app)
      } finally {
        await app?.close().catch(() => {})
        try { rmSync(userDataDir, { recursive: true, force: true }) } catch {}
      }
    },
    { scope: 'worker' },
  ],

  appPage: [
    async ({ electronApp }, use) => {
      const page = await getAppPage(electronApp)
      await use(page)
    },
    { scope: 'worker' },
  ],
})

export { expect } from '@playwright/test'
