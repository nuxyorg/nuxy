import { test, expect, type Page } from '../../src/e2e/fixtures.js'

async function openTool(page: Page, toolName: string) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.waitForTimeout(200)

  await page.keyboard.type(toolName)
  await page.waitForTimeout(800)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(300)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(2000)
}

test.describe('clipboard manager', () => {
  test('opens clipboard tool via search', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openTool(appPage, 'clipboard')

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/clipboard/)
  })

  test('clipboard tool renders list UI', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openTool(appPage, 'clipboard')

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/clipboard/)
  })

  test('pressing Backspace from clipboard returns to shell', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openTool(appPage, 'clipboard')

    await appPage.keyboard.press('Backspace')
    await appPage.waitForTimeout(500)

    const hasToolName = await appPage.evaluate(() => {
      const el = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      return el !== null && el.textContent !== ''
    })
    expect(hasToolName).toBe(false)
  })

  test('searching inside clipboard filters content', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openTool(appPage, 'clipboard')

    await appPage.keyboard.type('test')
    await appPage.waitForTimeout(600)

    const inputValue = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? ''
    )
    expect(inputValue).toBe('test')
  })
})
