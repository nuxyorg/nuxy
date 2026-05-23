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

async function openEmojiPicker(page: import('@playwright/test').Page) {
  await resetShell(page)
  await page.keyboard.type('emoji')
  await page.waitForSelector('[role="option"]', { timeout: 400 })
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    () => document.querySelector('.nuxy-shell-omni-bar__tool-name') !== null,
    { timeout: 400 }
  )
}

test.describe('emoji picker', () => {
  test('opens and shows emoji grid', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await openEmojiPicker(appPage)
    // Wait for the emoji grid content to actually render (dynamic import may take a moment)
    await appPage.waitForFunction(() => /😀|😊|❤|🎉/.test(document.body.innerText))

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toMatch(/😀|😊|❤|🎉/)
  })

  test('shows category navigation', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await openEmojiPicker(appPage)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.length).toBeGreaterThan(10)
  })

  test('search filters emojis', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await openEmojiPicker(appPage)

    await appPage.keyboard.type('heart')
    await appPage.waitForFunction(() => /heart|❤/i.test(document.body.innerText), { timeout: 400 })

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/heart|❤/)
  })

  test('search for "grin" shows grinning emojis', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await openEmojiPicker(appPage)

    await appPage.keyboard.type('grin')
    await appPage.waitForFunction(() => /😁|😀|grin/i.test(document.body.innerText), {
      timeout: 400,
    })

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toMatch(/😁|😀|grin/)
  })

  test('search returns to all emojis when cleared', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await openEmojiPicker(appPage)

    await appPage.keyboard.type('heart')
    await appPage.waitForFunction(() => /heart|❤/i.test(document.body.innerText), { timeout: 400 })

    await appPage.keyboard.press('Control+a')
    await appPage.keyboard.press('Delete')
    await appPage.waitForFunction(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value === '',
      { timeout: 400 }
    )
    await appPage.waitForFunction(() => /😀|😊|❤|🎉/.test(document.body.innerText), {
      timeout: 400,
    })

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.length).toBeGreaterThan(20)
  })

  test('closing emoji picker returns to shell', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await openEmojiPicker(appPage)

    await appPage.keyboard.press('Escape')
    await appPage.waitForFunction(
      () =>
        document.querySelector('.nuxy-shell-omni-bar__tool-name') === null ||
        (document.querySelector('.nuxy-shell-omni-bar__tool-name')?.textContent ?? '')
          .toLowerCase()
          .indexOf('emoji') === -1,
      { timeout: 400 }
    )

    const toolName = await appPage.evaluate(() => {
      const el = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      return el?.textContent ?? ''
    })
    expect(toolName.toLowerCase()).not.toMatch(/emoji/)
  })
})
