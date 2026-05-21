import { test, expect } from './fixtures.js'

// Reset shell to a clean state: dismiss any open tool and clear the input
async function resetShell(page: import('@playwright/test').Page) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.waitForTimeout(200)
}

test.describe('app launch', () => {
  test('window is visible', async ({ appPage }) => {
    expect(appPage.url()).toBeTruthy()
  })

  test('core API is injected via preload', async ({ appPage }) => {
    const hasCore = await appPage.evaluate(() => typeof (window as any).core === 'object')
    expect(hasCore).toBe(true)
  })

  test('shell input is present', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
  })
})

test.describe('shell search', () => {
  test('typing shows matching tool results', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('emoji')
    await appPage.waitForTimeout(800)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/emoji/)
  })

  test('typing calculator query shows calculator result', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('calc')
    await appPage.waitForTimeout(800)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/calc/)
  })

  test('escape clears active search', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })

    await appPage.keyboard.type('hello')
    await appPage.waitForTimeout(400)
    await appPage.keyboard.press('Escape')
    await appPage.waitForTimeout(300)

    const inputValue = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? '',
    )
    expect(inputValue).toBe('')
  })
})

test.describe('extension interactions', () => {
  test('opens emoji picker via keyboard navigation', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('emoji')
    await appPage.waitForTimeout(800)
    await appPage.keyboard.press('ArrowDown')
    await appPage.waitForTimeout(300)
    await appPage.keyboard.press('Enter')
    await appPage.waitForTimeout(1500)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/emoji|picker/)
  })

  test('emoji picker accepts search input', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('emoji')
    await appPage.waitForTimeout(800)
    await appPage.keyboard.press('ArrowDown')
    await appPage.waitForTimeout(300)
    await appPage.keyboard.press('Enter')
    await appPage.waitForTimeout(1500)

    await appPage.keyboard.type('heart')
    await appPage.waitForTimeout(600)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/heart|❤/)
  })

  test('opens time calculator via keyboard navigation', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('time')
    await appPage.waitForTimeout(800)
    await appPage.keyboard.press('ArrowDown')
    await appPage.waitForTimeout(300)
    await appPage.keyboard.press('Enter')
    await appPage.waitForTimeout(1500)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/time|clock|calc/)
  })
})
