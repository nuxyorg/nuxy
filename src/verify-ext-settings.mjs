import { _electron as electron } from '@playwright/test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'

const PROJECT_ROOT = '/home/xava/Documents/nuxy'
const APP_DIR = resolve(PROJECT_ROOT, 'src')
const ELECTRON_BIN = execSync(
  `find "${PROJECT_ROOT}/node_modules/.pnpm" -name "electron" -path "*/dist/electron" -type f 2>/dev/null | head -1`
)
  .toString()
  .trim()

const userDataDir = mkdtempSync(resolve(tmpdir(), 'nuxy-verify-'))
const nuxyDataDir = resolve(userDataDir, 'nuxy-data')
const settingsDir = resolve(nuxyDataDir, 'com.nuxy.settings')
mkdirSync(settingsDir, { recursive: true })
writeFileSync(
  resolve(settingsDir, 'settings.json'),
  JSON.stringify({ blurAction: 'none', escAction: 'none', showOnStartup: true })
)

const cleanEnv = { ...process.env }
delete cleanEnv.WAYLAND_DISPLAY

const app = await electron.launch({
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
    NUXY_EXTENSIONS_SRC: resolve(PROJECT_ROOT, 'extensions'),
  },
  timeout: 30000,
})

const page = await app.firstWindow()

// Capture console output from renderer
const consoleLogs = []
page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`))

await page.waitForLoadState('domcontentloaded')
await page.waitForTimeout(4000)

// Open settings
const settingsItem = page.getByText('Settings').first()
if ((await settingsItem.count()) > 0) {
  await settingsItem.click()
  await page.waitForTimeout(2000)
}

await page.screenshot({ path: '/tmp/nvs-3-settings.png' })

// Probe: call getExtensionSettingsSchemas directly via renderer console
const schemas = await page.evaluate(async () => {
  try {
    const res = await window.core.ipc.invoke('kernel', 'getExtensionSettingsSchemas', {})
    return res
  } catch (e) {
    return { error: e.message }
  }
})
console.log('getExtensionSettingsSchemas result:', JSON.stringify(schemas))

// Click Extensions tab
const extTab = page.getByText('Extensions').first()
if ((await extTab.count()) > 0) {
  await extTab.click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '/tmp/nvs-4-ext-tab.png' })

  // Check visible text in the panel
  const panelText = await page
    .locator('[class*="scroll"], [class*="right"], main, [class*="panel"]')
    .first()
    .allTextContents()
    .catch(() => ['(none)'])
  console.log('Panel text:', panelText.slice(0, 3))

  const dlField = await page.getByText('Download Location').count()
  const fmtField = await page.getByText('Preferred Format').count()
  console.log('Download Location visible:', dlField)
  console.log('Preferred Format visible:', fmtField)

  // Scroll down to see if fields are below
  await page.evaluate(() => {
    const scrollable = document.querySelector('[class*="scroll"]')
    if (scrollable) scrollable.scrollTop = scrollable.scrollHeight
  })
  await page.waitForTimeout(500)
  await page.screenshot({ path: '/tmp/nvs-5-scrolled.png' })
}

console.log('\n--- Console logs ---')
consoleLogs.forEach((l) => console.log(l))

await app.close()
rmSync(userDataDir, { recursive: true, force: true })
