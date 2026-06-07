import { test, expect } from '../../src/e2e/fixtures.js'
import { openTool } from '../e2e-helpers.js'

const openN8n = (page: any) => openTool(page, 'n8n')

test.describe('n8n extension — keyboard navigation', () => {
  test.beforeEach(async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await openN8n(appPage)
  })

  test('no mouse-only buttons rendered in toolbar or list rows', async ({ appPage }) => {
    const buttons = appPage.locator('.nuxy-section-header button, .nuxy-list-item-actions button')
    await expect(buttons).toHaveCount(0)
  })

  test('Ctrl+, opens configure panel', async ({ appPage }) => {
    await appPage.keyboard.press('Control+,')
    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/configure|url|api key/i)
  })

  test('Ctrl+Enter saves config when configure panel is open', async ({ appPage }) => {
    await appPage.keyboard.press('Control+,')
    await appPage.waitForFunction(
      () => document.body.innerText.toLowerCase().includes('configure'),
      { timeout: 400 }
    )
    await appPage.keyboard.press('Control+Enter')
    await appPage.evaluate(() => new Promise((r) => setTimeout(r, 200)))

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).not.toMatch(/configure n8n/i)
  })

  test('Escape closes configure panel without saving', async ({ appPage }) => {
    await appPage.keyboard.press('Control+,')
    await appPage.waitForFunction(
      () => document.body.innerText.toLowerCase().includes('configure'),
      { timeout: 400 }
    )
    await appPage.keyboard.press('Escape')
    await appPage.evaluate(() => new Promise((r) => setTimeout(r, 200)))

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).not.toMatch(/configure n8n/i)
  })

  test('configure panel is not open initially when already configured', async ({ appPage }) => {
    const body = await appPage.evaluate(() => document.body.innerText)
    if (!body.toLowerCase().includes('configure')) {
      const buttons = appPage.locator('.nuxy-shell-tool-wrapper button')
      await expect(buttons).toHaveCount(0)
    }
  })

  test('Ctrl+, toggles configure panel off when already open', async ({ appPage }) => {
    await appPage.keyboard.press('Control+,')
    await appPage.waitForFunction(
      () => document.body.innerText.toLowerCase().includes('configure'),
      { timeout: 400 }
    )

    await appPage.keyboard.press('Control+,')
    await appPage.evaluate(() => new Promise((r) => setTimeout(r, 200)))

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).not.toMatch(/configure n8n/i)
  })
})
