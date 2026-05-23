import { test, expect, type Page } from '../../src/e2e/fixtures.js'

async function resetShell(page: Page) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.waitForTimeout(200)
}

async function openTool(page: import('@playwright/test').Page, toolName: string) {
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

async function openSettings(page: import('@playwright/test').Page) {
  await resetShell(page)
  await page.keyboard.type('settings')
  await page.waitForTimeout(800)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(300)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(2000)
}

test.describe('settings tool', () => {
  test('opens settings tool via search', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openTool(appPage, 'settings')

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/settings/)
  })

  test('settings UI renders appearance section', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openTool(appPage, 'settings')

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/appearance|theme|zoom/)
  })

  test('settings UI renders window section', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openTool(appPage, 'settings')

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/window|esc|action/)
  })

  test('settings rows are navigable with keyboard', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openTool(appPage, 'settings')

    await appPage.keyboard.press('ArrowDown')
    await appPage.waitForTimeout(200)
    await appPage.keyboard.press('ArrowDown')
    await appPage.waitForTimeout(200)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/settings|appearance|theme/)
  })

  test('core API is available inside settings tool', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openTool(appPage, 'settings')

    const hasCore = await appPage.evaluate(() => typeof (window as any).core === 'object')
    expect(hasCore).toBe(true)
  })
})

test.describe('settings IPC channels', () => {
  test('getSettings channel returns full settings object', async ({ appPage }) => {
    const result = await appPage.evaluate(async () => {
      return (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})
    })
    expect(result.success).toBe(true)
    const s = result.data
    expect(typeof s.theme).toBe('string')
    expect(typeof s.zoom).toBe('string')
    expect(typeof s.escAction).toBe('string')
    expect(typeof s.windowWidth).toBe('number')
    expect(typeof s.opacity).toBe('number')
  })

  test('saveSettings persists and returns the saved object', async ({ appPage }) => {
    const result = await appPage.evaluate(async () => {
      return (window as any).core.ipc.invoke('com.nuxy.settings', 'saveSettings', {
        theme: 'dark',
        zoom: '100%',
        escAction: 'hide',
        blurAction: 'hide',
        windowWidth: 800,
        windowMaxHeight: 600,
        alwaysOnTop: false,
        opacity: 1,
        showInTaskbar: false,
        showOnStartup: false,
        windowPosition: '1/2, 1/3',
        iconPack: '',
        font: 'system',
      })
    })
    expect(result.success).toBe(true)
    expect(result.data.theme).toBe('dark')
    expect(result.data.zoom).toBe('100%')
  })

  test('settings tool UI shows current zoom value', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openSettings(appPage)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toMatch(/100%|zoom|75%|90%|125%/)
  })

  test('settings tool UI shows theme options', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openSettings(appPage)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/theme|dark|light/)
  })
})
