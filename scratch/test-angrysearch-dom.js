import { _electron as electron } from '@playwright/test'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

const PROJECT_ROOT = '/home/xava/Documents/nuxy'
const APP_DIR = resolve(PROJECT_ROOT, 'src')
const ELECTRON_BIN = execSync(
  `find "${PROJECT_ROOT}/node_modules/.pnpm" -name "electron" -path "*/dist/electron" -type f 2>/dev/null | head -1`
)
  .toString()
  .trim()

const cleanEnv = { ...process.env }
delete cleanEnv.WAYLAND_DISPLAY

const app = await electron.launch({
  executablePath: ELECTRON_BIN,
  args: [
    '--no-sandbox',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    APP_DIR,
  ],
  env: {
    ...cleanEnv,
    DISPLAY: process.env.DISPLAY ?? ':0',
    ELECTRON_OZONE_PLATFORM_HINT: 'x11',
  },
  timeout: 30000,
})

const page = await app.firstWindow()
await page.waitForLoadState('domcontentloaded')
await page.waitForTimeout(4000)

// Open settings
const settingsItem = page.getByText('Settings').first()
if ((await settingsItem.count()) > 0) {
  await settingsItem.click()
  await page.waitForTimeout(2000)
}

// Click ANGRYsearch tab in the left bar if it exists, or just scroll/inspect the right panel
// Let's click the ANGRYsearch tab
const tab = page.locator('nuxy-tab-bar').locator('text=ANGRYsearch').first()
if ((await tab.count()) > 0) {
  await tab.click()
  await page.waitForTimeout(1000)
}

// Query the DOM of settings panel
const result = await page.evaluate(() => {
  // Find ANGRYsearch section header
  const headers = Array.from(document.querySelectorAll('nuxy-section-header'))
  const angryHeader = headers.find((h) => h.getAttribute('label') === 'ANGRYsearch')
  if (!angryHeader) return { error: 'ANGRYsearch section not found' }

  // The section content is the next sibling list or sibling elements until next header
  const info = []
  let sibling = angryHeader.nextElementSibling
  while (sibling && sibling.tagName !== 'NUXY-SECTION-HEADER') {
    if (sibling.tagName === 'NUXY-LIST') {
      const items = Array.from(sibling.querySelectorAll('nuxy-list-item'))
      for (const item of items) {
        const text = item.querySelector('nuxy-list-item-text')?.textContent?.trim()
        const desc = item.querySelector('span')?.textContent?.trim()
        const actions = item.querySelector('nuxy-list-item-actions')
        const children = actions
          ? Array.from(actions.children).map((c) => ({
              tagName: c.tagName.toLowerCase(),
              type: c.getAttribute('type'),
              options: c.getAttribute('options'),
            }))
          : []
        info.push({ text, desc, children })
      }
    }
    sibling = sibling.nextElementSibling
  }
  return { info }
})

console.log('ANGRYsearch Settings DOM Info:')
console.log(JSON.stringify(result, null, 2))

await app.close()
