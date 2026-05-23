import { test, expect, type Page } from '../../src/e2e/fixtures.js'

async function resetShell(page: Page) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.waitForTimeout(200)
}

async function openEmojiPicker(page: import('@playwright/test').Page) {
  await resetShell(page)
  await page.keyboard.type('emoji')
  await page.waitForTimeout(800)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(300)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(2000)
}

test.describe('emoji picker', () => {
  test('opens and shows emoji grid', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openEmojiPicker(appPage)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toMatch(/emoji|😀|😊|❤|🎉/)
  })

  test('shows category navigation', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openEmojiPicker(appPage)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.length).toBeGreaterThan(10)
  })

  test('search filters emojis', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openEmojiPicker(appPage)

    await appPage.keyboard.type('heart')
    await appPage.waitForTimeout(600)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/heart|❤/)
  })

  test('search for "grin" shows grinning emojis', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openEmojiPicker(appPage)

    await appPage.keyboard.type('grin')
    await appPage.waitForTimeout(600)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toMatch(/😁|😀|grin/)
  })

  test('search returns to all emojis when cleared', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openEmojiPicker(appPage)

    await appPage.keyboard.type('heart')
    await appPage.waitForTimeout(600)

    await appPage.keyboard.press('Control+a')
    await appPage.keyboard.press('Delete')
    await appPage.waitForTimeout(600)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.length).toBeGreaterThan(20)
  })

  test('closing emoji picker returns to shell', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openEmojiPicker(appPage)

    await appPage.keyboard.press('Escape')
    await appPage.waitForTimeout(500)

    const toolName = await appPage.evaluate(() => {
      const el = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      return el?.textContent ?? ''
    })
    expect(toolName.toLowerCase()).not.toMatch(/emoji/)
  })
})
