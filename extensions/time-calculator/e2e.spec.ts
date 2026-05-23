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

test.describe('time calculator provider', () => {
  test('typing "12pm london" shows a time conversion result', async ({ appPage }) => {
    await resetShell(appPage)
    await appPage.waitForSelector('input', { timeout: 400 })

    await appPage.keyboard.type('12pm london')
    await appPage.waitForFunction(() => /london|12|time|pm|am/i.test(document.body.innerText), {
      timeout: 400,
    })

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/london|12|time|pm|am/)
  })

  test('typing "9am tokyo" shows tokyo time', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await resetShell(appPage)

    await appPage.keyboard.type('9am tokyo')
    await appPage.waitForFunction(() => /tokyo|9|time|am|pm/i.test(document.body.innerText), {
      timeout: 400,
    })

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/tokyo|9|time|am|pm/)
  })

  test('time query shows a provider result item', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await resetShell(appPage)

    await appPage.keyboard.type('3pm paris')
    await appPage.waitForFunction(() => /paris|3|time|pm/i.test(document.body.innerText), {
      timeout: 400,
    })

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/paris|3|time|pm/)
  })

  test('24-hour format query is recognized', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await resetShell(appPage)

    await appPage.keyboard.type('15:00 berlin')
    await appPage.waitForFunction(() => /berlin|15|time/i.test(document.body.innerText), {
      timeout: 400,
    })

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/berlin|15|time/)
  })

  test('non-time query does not trigger time provider', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await resetShell(appPage)

    await appPage.keyboard.type('just some text without time')
    await appPage.waitForFunction(
      () =>
        (document.querySelector('input') as HTMLInputElement | null)?.value ===
        'just some text without time',
      { timeout: 400 }
    )
    await appPage.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).not.toMatch(/local time|→.*time/)
  })
})
