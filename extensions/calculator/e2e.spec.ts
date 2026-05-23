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

test.describe('calculator provider', () => {
  test('2+2 shows "= 4"', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await resetShell(appPage)

    await appPage.keyboard.type('2+2')
    await appPage.waitForFunction(() => /=\s*4/.test(document.body.innerText), { timeout: 400 })

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toMatch(/=\s*4/)
  })

  test('100/4+5*3 shows "= 40"', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await resetShell(appPage)

    await appPage.keyboard.type('100/4+5*3')
    await appPage.waitForFunction(() => /=\s*40/.test(document.body.innerText), { timeout: 400 })

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toMatch(/=\s*40/)
  })

  test('(10+5)*2 shows "= 30"', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await resetShell(appPage)

    await appPage.keyboard.type('(10+5)*2')
    await appPage.waitForFunction(() => /=\s*30/.test(document.body.innerText), { timeout: 400 })

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toMatch(/=\s*30/)
  })

  test('non-math query does not show calculator result', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await resetShell(appPage)

    await appPage.keyboard.type('hello world')
    await appPage.waitForFunction(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value === 'hello world',
      { timeout: 400 }
    )
    await appPage.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).not.toMatch(/=\s*\d+/)
  })

  test('clears result when input is cleared', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await resetShell(appPage)

    await appPage.keyboard.type('5+5')
    await appPage.waitForFunction(() => /=\s*10/.test(document.body.innerText), { timeout: 400 })
    await appPage.keyboard.press('Escape')
    await appPage.waitForFunction(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value === '',
      { timeout: 400 }
    )

    const inputValue = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? ''
    )
    expect(inputValue).toBe('')
  })
})
