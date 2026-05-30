import { test as base, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page, TestInfo } from '@playwright/test'
import { execSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..', '..')
const APP_DIR = resolve(__dirname, '..')

function findElectronBin(): string {
  const bin = execSync(
    `find "${PROJECT_ROOT}/node_modules/.pnpm" -name "electron" -path "*/dist/electron" -type f 2>/dev/null | head -1`
  )
    .toString()
    .trim()
  if (!bin) throw new Error('Could not locate electron binary in pnpm store')
  return bin
}

const ELECTRON_BIN = findElectronBin()

function createTestDataDir(baseDir: string): string {
  const settingsDir = resolve(baseDir, 'com.nuxy.settings')
  mkdirSync(settingsDir, { recursive: true })
  writeFileSync(
    resolve(settingsDir, 'settings.json'),
    JSON.stringify({ blurAction: 'none', escAction: 'none', showOnStartup: true })
  )
  return baseDir
}

async function launchApp(userDataDir: string, headless: boolean): Promise<ElectronApplication> {
  // Use a unique user-data-dir so Electron's requestSingleInstanceLock
  // doesn't conflict with any running nuxy instance on the developer's machine.
  // NUXY_DATA_DIR isolates settings (escAction, blurAction) without touching extensions.
  const nuxyDataDir = createTestDataDir(resolve(userDataDir, 'nuxy-data'))

  // Clean up the UNIX socket to ensure we wait for a fresh socket to be created
  const socketPath = resolve(tmpdir(), 'nuxy.sock')
  try {
    rmSync(socketPath, { force: true })
  } catch {}

  const cleanEnv = { ...process.env }
  // If running in a Wayland environment, delete WAYLAND_DISPLAY so Electron falls back
  // to X11 (and thus correctly uses the virtual display set by xvfb-run).
  delete cleanEnv.WAYLAND_DISPLAY

  return electron.launch({
    executablePath: ELECTRON_BIN,
    args: [
      '--no-sandbox',
      `--user-data-dir=${userDataDir}`,
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      APP_DIR,
    ],
    env: {
      ...cleanEnv,
      DISPLAY: process.env.DISPLAY ?? ':0',
      ELECTRON_OZONE_PLATFORM_HINT: 'x11',
      NUXY_DATA_DIR: nuxyDataDir,
    },
    timeout: 3000,
  })
}

async function getAppPage(app: ElectronApplication): Promise<Page> {
  // Wait for the UNIX socket file to be created, indicating full bootstrap
  const socketPath = resolve(tmpdir(), 'nuxy.sock')
  const startTime = Date.now()
  while (!existsSync(socketPath) && Date.now() - startTime < 2000) {
    await new Promise<void>((r) => setTimeout(r, 10))
  }

  const page =
    app.windows().find((w) => !w.url().startsWith('devtools://')) ?? (await app.firstWindow())
  page.on('console', (msg) => console.log(`[BROWSER-CONSOLE] ${msg.type()}: ${msg.text()}`))
  page.on('pageerror', (err) => console.error(`[BROWSER-PAGEERROR] ${err.message}\nStack:\n${err.stack}`))
  await page.waitForSelector('input', { timeout: 3000 })
  return page
}

type ElectronWorkerFixtures = {
  electronApp: ElectronApplication
  appPage: Page
}

type ElectronTestFixtures = {
  autoScreenshot: void
}

export const test = base.extend<ElectronTestFixtures, ElectronWorkerFixtures>({
  // scope: 'worker' — one Electron instance shared across all tests in the worker
  electronApp: [
    async ({ headless }, use) => {
      const userDataDir = mkdtempSync(resolve(tmpdir(), 'nuxy-test-'))
      let app: ElectronApplication | undefined
      try {
        app = await launchApp(userDataDir, headless)
        await use(app)
      } finally {
        await app?.close().catch(() => {})
        try {
          rmSync(userDataDir, { recursive: true, force: true })
        } catch {}
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

  autoScreenshot: [
    async ({ appPage }, use, testInfo: TestInfo) => {
      await use()
      if (!appPage.isClosed()) {
        const screenshot = await appPage.screenshot().catch(() => null)
        if (screenshot) {
          await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' })
        }
      }
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
export type { Page } from '@playwright/test'
