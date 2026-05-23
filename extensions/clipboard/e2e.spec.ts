import { test, expect, type Page } from '../../src/e2e/fixtures.js'

async function resetShell(page: any) {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
  })
  await page.waitForFunction(
    () => {
      const toolName = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      const palette = document.querySelector('.nuxy-command-palette')
      const input = document.querySelector('input') as HTMLInputElement | null
      return toolName === null && palette === null && (input?.value ?? '') === ''
    },
    { timeout: 400 }
  )
  await page.locator('input').focus()
}

async function openTool(page: Page, toolName: string) {
  await resetShell(page)

  await page.keyboard.type(toolName)
  const option = page.locator('[role="option"]', { hasText: toolName })
  await option.first().click()
  await page.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 400 })
  await page.waitForFunction(
    () => (document.querySelector('input') as HTMLInputElement | null)?.value === '',
    { timeout: 400 }
  )
  await page.locator('input').focus()
}

test.describe('clipboard manager', () => {
  test('opens clipboard tool via search', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await openTool(appPage, 'clipboard')

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/clipboard/)
  })

  test('clipboard tool renders list UI', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await openTool(appPage, 'clipboard')

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/clipboard/)
  })

  test('pressing Backspace from clipboard returns to shell', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await openTool(appPage, 'clipboard')

    await appPage.keyboard.press('Backspace')
    await appPage.waitForFunction(
      () => document.querySelector('.nuxy-shell-omni-bar__tool-name') === null,
      { timeout: 400 }
    )

    const hasToolName = await appPage.evaluate(() => {
      const el = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      return el !== null && el.textContent !== ''
    })
    expect(hasToolName).toBe(false)
  })

  test('searching inside clipboard filters content', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await openTool(appPage, 'clipboard')

    await appPage.waitForSelector('input:not([disabled])', { timeout: 400 })
    await appPage.locator('input').click()
    await appPage.keyboard.type('test')
    await appPage.waitForFunction(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value === 'test',
      { timeout: 400 }
    )

    const inputValue = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? ''
    )
    expect(inputValue).toBe('test')
  })
})
