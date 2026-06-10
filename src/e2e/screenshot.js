import { _electron as electron } from '@playwright/test'
import { resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const PROJECT_ROOT = resolve(__dirname, '..', '..')
const APP_DIR = resolve(__dirname, '..')

function findElectronBin() {
  try {
    return require('electron')
  } catch {
    return resolve(
      PROJECT_ROOT,
      'node_modules/.pnpm/electron@42.1.0/node_modules/electron/dist/electron'
    )
  }
}

const ELECTRON_BIN = findElectronBin()

async function run() {
  const userDataDir = mkdtempSync(resolve(tmpdir(), 'nuxy-screenshot-'))
  const socketPath = resolve(
    tmpdir(),
    `nuxy-screenshot-${Math.random().toString(36).substring(2, 9)}.sock`
  )

  const settingsDir = resolve(userDataDir, 'nuxy-data', 'com.nuxy.settings')
  mkdirSync(settingsDir, { recursive: true })
  writeFileSync(
    resolve(settingsDir, 'settings.json'),
    JSON.stringify({ blurAction: 'none', escAction: 'none', showOnStartup: true })
  )

  console.log('Launching Electron...')
  const app = await electron.launch({
    executablePath: ELECTRON_BIN,
    args: ['--no-sandbox', '--ozone-platform=x11', `--user-data-dir=${userDataDir}`, APP_DIR],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      NUXY_DATA_DIR: resolve(userDataDir, 'nuxy-data'),
      NUXY_SOCKET_PATH: socketPath,
    },
  })

  try {
    // Wait for window
    console.log('Waiting for window...')
    const page = await app.firstWindow()
    await page.waitForSelector('input', { timeout: 5000 })

    // Open settings tool via search
    console.log('Typing in omnibar...')
    const input = page.locator('.nuxy-shell-omni-bar__input')
    await input.click()
    await input.fill('settings')
    await input.dispatchEvent('input', { bubbles: true })

    // Press ArrowDown to select settings tool
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    console.log('Waiting 3 seconds for settings tool to mount and render...')
    await page.waitForTimeout(3000)

    console.log('Taking screenshot...')
    const screenshotPath =
      '/home/xava/.gemini/antigravity-ide/brain/47735c7d-1391-4f62-a413-943b666dae76/screenshot.png'
    await page.screenshot({ path: screenshotPath })
    console.log(`Screenshot saved to: ${screenshotPath}`)
  } catch (err) {
    console.error('Error during screenshot script:', err)
  } finally {
    await app.close()
    rmSync(userDataDir, { recursive: true, force: true })
  }
}

run()
