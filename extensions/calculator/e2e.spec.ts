import { test, expect, type Page } from '../../src/e2e/fixtures.js'

async function resetShell(page: Page) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.waitForTimeout(200)
}

test.describe('calculator provider', () => {
  test('2+2 shows "= 4"', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('2+2')
    await appPage.waitForTimeout(600)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toMatch(/=\s*4/)
  })

  test('100/4+5*3 shows "= 40"', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('100/4+5*3')
    await appPage.waitForTimeout(600)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toMatch(/=\s*40/)
  })

  test('(10+5)*2 shows "= 30"', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('(10+5)*2')
    await appPage.waitForTimeout(600)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toMatch(/=\s*30/)
  })

  test('non-math query does not show calculator result', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('hello world')
    await appPage.waitForTimeout(600)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).not.toMatch(/=\s*\d+/)
  })

  test('clears result when input is cleared', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('5+5')
    await appPage.waitForTimeout(600)
    await appPage.keyboard.press('Escape')
    await appPage.waitForTimeout(400)

    const inputValue = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? ''
    )
    expect(inputValue).toBe('')
  })
})
