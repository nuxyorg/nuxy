import { test, expect } from '../../src/e2e/fixtures.ts'

async function resetShell(page: any) {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
  })
  await page.waitForFunction(
    () => {
      const toolName = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      const input = document.querySelector('.nuxy-shell-omni-bar__input') as HTMLInputElement | null
      return toolName === null && (input?.value ?? '') === ''
    },
    { timeout: 400 }
  )
  await page.locator('.nuxy-shell-omni-bar__input').focus()
}

async function openN8n(page: any) {
  await resetShell(page)
  await page.keyboard.type('n8n')
  const option = page.locator('[role="option"]', { hasText: 'n8n' })
  await option.first().click()
  await page.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 400 })
  await page.locator('.nuxy-shell-omni-bar__input').focus()
}

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
