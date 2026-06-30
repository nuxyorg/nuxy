import { test as base, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page, TestInfo } from '@playwright/test'
import { execSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const PROJECT_ROOT = resolve(__dirname, '..', '..')
const APP_DIR = resolve(__dirname, '..')

function findElectronBin(): string {
  try {
    return require('electron')
  } catch {
    const bin = execSync(
      `find "${PROJECT_ROOT}/node_modules/.pnpm" -name "electron" -path "*/dist/electron" -type f 2>/dev/null | head -1`
    )
      .toString()
      .trim()
    if (!bin) throw new Error('Could not locate electron binary in pnpm store')
    return bin
  }
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

async function launchApp(
  userDataDir: string,
  headless: boolean,
  socketPath: string
): Promise<ElectronApplication> {
  // Use a unique user-data-dir so Electron's requestSingleInstanceLock
  // doesn't conflict with any running nuxy instance on the developer's machine.
  // NUXY_DATA_DIR isolates settings (escAction, blurAction) without touching extensions.
  const nuxyDataDir = createTestDataDir(resolve(userDataDir, 'nuxy-data'))

  // Clean up the UNIX socket to ensure we wait for a fresh socket to be created
  try {
    rmSync(socketPath, { force: true })
  } catch (err: unknown) {
    console.warn('[e2e] failed to remove stale socket', err)
  }

  const cleanEnv = { ...process.env }
  // Cursor/Playwright may set ELECTRON_RUN_AS_NODE — Electron then exits immediately as Node.
  delete cleanEnv.ELECTRON_RUN_AS_NODE
  // If running in a Wayland environment, delete WAYLAND_DISPLAY so Electron falls back
  // to X11 (and thus correctly uses the virtual display set by xvfb-run).
  delete cleanEnv.WAYLAND_DISPLAY

  const app = await electron.launch({
    executablePath: ELECTRON_BIN,
    args: [
      '--no-sandbox',
      '--ozone-platform=x11',
      `--user-data-dir=${userDataDir}`,
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      APP_DIR,
    ],
    env: {
      ...cleanEnv,
      NODE_ENV: 'test',
      LOG_LEVEL: process.env.LOG_LEVEL ?? 'warn',
      DISPLAY: process.env.DISPLAY ?? ':0',
      ELECTRON_OZONE_PLATFORM_HINT: 'x11',
      NUXY_DATA_DIR: nuxyDataDir,
      NUXY_SOCKET_PATH: socketPath,
    },
    timeout: 15000,
  })
  app.process().stdout?.on('data', (data) => console.log(`[MAIN-STDOUT] ${data.toString().trim()}`))
  app
    .process()
    .stderr?.on('data', (data) => console.error(`[MAIN-STDERR] ${data.toString().trim()}`))
  return app
}

async function getAppPage(app: ElectronApplication, socketPath: string): Promise<Page> {
  // Wait for the UNIX socket file to be created, indicating full bootstrap
  const startTime = Date.now()
  while (!existsSync(socketPath) && Date.now() - startTime < 2000) {
    await new Promise<void>((r) => setTimeout(r, 10))
  }

  const page =
    app.windows().find((w) => !w.url().startsWith('devtools://')) ?? (await app.firstWindow())
  page.on('console', (msg) => console.log(`[BROWSER-CONSOLE] ${msg.type()}: ${msg.text()}`))
  page.on('pageerror', (err) =>
    console.error(`[BROWSER-PAGEERROR] ${err.message}\nStack:\n${err.stack}`)
  )
  await page.waitForSelector('input', { timeout: 3000 })
  // Wait until extension tools are registered in the kernel (proves backend workers are ready)
  await page.waitForFunction(
    async () => {
      try {
        const result = await (window as any).core?.ipc?.invoke('kernel', 'listTools', {})
        return Array.isArray(result?.data) && result.data.length > 0
      } catch {
        return false
      }
    },
    { timeout: 3000 }
  )
  return page
}

type ElectronWorkerFixtures = {
  electronApp: ElectronApplication
  appPage: Page
  socketPath: string
}

type ElectronTestFixtures = {
  autoScreenshot: void
}

export const test = base.extend<ElectronTestFixtures, ElectronWorkerFixtures>({
  socketPath: [
    // eslint-disable-next-line no-empty-pattern -- Playwright fixture signature requires the destructure
    async ({}, use) => {
      const socketName = `nuxy-test-${Math.random().toString(36).substring(2, 9)}.sock`
      const socketPath = resolve(tmpdir(), socketName)
      await use(socketPath)
    },
    { scope: 'worker' },
  ],

  // scope: 'worker' — one Electron instance shared across all tests in the worker
  electronApp: [
    async ({ headless, socketPath }, use) => {
      const userDataDir = mkdtempSync(resolve(tmpdir(), 'nuxy-test-'))
      let app: ElectronApplication | undefined
      try {
        app = await launchApp(userDataDir, headless, socketPath)
        await use(app)
      } finally {
        await app
          ?.close()
          .catch((err: unknown) => console.warn('[e2e] electron app close failed', err))
        try {
          rmSync(userDataDir, { recursive: true, force: true })
        } catch (err: unknown) {
          console.warn('[e2e] failed to remove test userDataDir', err)
        }
      }
    },
    { scope: 'worker' },
  ],

  appPage: [
    async ({ electronApp, socketPath }, use) => {
      const page = await getAppPage(electronApp, socketPath)
      const injectScript = () => {
        function getDeepText(node: Node): string {
          if (node.nodeType === Node.TEXT_NODE) {
            return node.nodeValue ?? ''
          }
          let text = ''
          if (node instanceof HTMLElement && node.shadowRoot) {
            for (const child of node.shadowRoot.childNodes) {
              text += getDeepText(child)
            }
          }
          for (const child of node.childNodes) {
            text += getDeepText(child)
          }
          return text
        }

        Object.defineProperty(HTMLBodyElement.prototype, 'innerText', {
          get() {
            return getDeepText(this)
          },
          configurable: true,
        })

        function querySelectorAllDeep(selector: string, root: Node): Element[] {
          const elements: Element[] = []
          function traverse(node: Node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as Element
              if (el.matches(selector)) {
                elements.push(el)
              }
            }
            if (node instanceof HTMLElement && node.shadowRoot) {
              for (const child of node.shadowRoot.childNodes) {
                traverse(child)
              }
            }
            for (const child of node.childNodes) {
              traverse(child)
            }
          }
          traverse(root)
          return elements
        }

        const overrideQuery = (proto: any) => {
          proto.querySelectorAll = function (selector: string) {
            return querySelectorAllDeep(selector, this)
          }
          proto.querySelector = function (selector: string) {
            return querySelectorAllDeep(selector, this)[0] || null
          }
        }

        overrideQuery(Document.prototype)
        overrideQuery(Element.prototype)
        overrideQuery(DocumentFragment.prototype)
      }
      await page.addInitScript(injectScript)
      await page.evaluate(injectScript)
      await use(page)
    },
    { scope: 'worker' },
  ],

  autoScreenshot: [
    async ({ appPage }, use, testInfo: TestInfo) => {
      await use()
      if (!appPage.isClosed()) {
        const screenshot = await appPage.screenshot().catch((err: unknown) => {
          console.warn('[e2e] screenshot capture failed', err)
          return null
        })
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
