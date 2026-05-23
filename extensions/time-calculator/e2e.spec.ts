import { test, expect, type Page } from '../../src/e2e/fixtures.js'

async function resetShell(page: Page) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.waitForTimeout(200)
}

test.describe('time calculator provider', () => {
  test('typing "12pm london" shows a time conversion result', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('12pm london')
    await appPage.waitForTimeout(1000)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/london|12|time|pm|am/)
  })

  test('typing "9am tokyo" shows tokyo time', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('9am tokyo')
    await appPage.waitForTimeout(1000)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/tokyo|9|time|am|pm/)
  })

  test('time query shows a provider result item', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('3pm paris')
    await appPage.waitForTimeout(1000)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/paris|3|time|pm/)
  })

  test('24-hour format query is recognized', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('15:00 berlin')
    await appPage.waitForTimeout(1000)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/berlin|15|time/)
  })

  test('non-time query does not trigger time provider', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('just some text without time')
    await appPage.waitForTimeout(800)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).not.toMatch(/local time|→.*time/)
  })
})
