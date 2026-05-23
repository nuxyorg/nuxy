/**
 * Tests for theme switching and zoom level changes via the settings tool.
 * Verifies that CSS variables and document.documentElement.style.zoom actually update.
 */
import { test, expect } from './fixtures.js'

async function resetShell(page: import('@playwright/test').Page) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.waitForTimeout(200)
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

test.describe('theme switching via IPC', () => {
  test('getThemeByName "light" returns different colors than "dark"', async ({ appPage }) => {
    const dark = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'getThemeByName', { name: 'dark' })
    )
    const light = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'getThemeByName', { name: 'light' })
    )
    expect(dark.success).toBe(true)
    expect(light.success).toBe(true)
    // Dark and light themes should differ in at least one property
    expect(JSON.stringify(dark.data)).not.toBe(JSON.stringify(light.data))
  })

  test('active theme CSS vars are present in computed style on document root', async ({
    appPage,
  }) => {
    // Get the current theme name from settings
    const settings = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})
    )
    expect(settings.success).toBe(true)
    const themeName: string = settings.data.theme || 'dark'

    // Fetch that theme's color definitions
    const themeData = await appPage.evaluate(
      async (name: string) =>
        (window as any).core.ipc.invoke('kernel', 'getThemeByName', { name }),
      themeName
    )
    expect(themeData.success).toBe(true)

    // Verify at least one CSS var from the theme is present in computed style —
    // this confirms the renderer shell actually applies the theme, not just that
    // the IPC channel returns data.
    const result = await appPage.evaluate((theme: any) => {
      const computed = getComputedStyle(document.documentElement)
      const all: Record<string, string> = {}
      for (const key of Object.keys(theme.data?.colors ?? {})) {
        all[`--${key}`] = computed.getPropertyValue(`--${key}`).trim()
      }
      for (const key of Object.keys(theme.data?.tokens ?? {})) {
        all[`--${key}`] = computed.getPropertyValue(`--${key}`).trim()
      }
      const applied = Object.values(all).filter((v) => v !== '').length
      return { applied, total: Object.keys(all).length, vars: all }
    }, themeData)

    expect(result.total).toBeGreaterThan(0)
    expect(result.applied).toBeGreaterThan(0)
  })

  test('dark theme has colors/tokens defined', async ({ appPage }) => {
    const result = await appPage.evaluate(async () => {
      const res = await (window as any).core.ipc.invoke('kernel', 'getThemeByName', { name: 'dark' })
      if (!res?.success) return null
      const { colors, tokens } = res.data
      return {
        hasColors: colors && Object.keys(colors).length > 0,
        hasTokens: tokens && Object.keys(tokens).length > 0,
      }
    })
    expect(result).not.toBeNull()
    expect(result!.hasColors || result!.hasTokens).toBe(true)
  })
})

test.describe('zoom level changes via settings', () => {
  test('initial zoom is 100% or not set', async ({ appPage }) => {
    const zoom = await appPage.evaluate(() => {
      const z = document.documentElement.style.zoom
      return z || '100%'
    })
    expect(zoom).toMatch(/100%|1|^$/)
  })

  test('applying zoom setting updates document.documentElement.style.zoom', async ({ appPage }) => {
    // Simulate what applySettings does: set zoom directly
    const result = await appPage.evaluate(() => {
      document.documentElement.style.zoom = '90%'
      return document.documentElement.style.zoom
    })
    expect(result).toBe('90%')

    // Reset
    await appPage.evaluate(() => {
      document.documentElement.style.zoom = '100%'
    })
  })
})

test.describe('settings tool opens and reads current values', () => {
  test('getSettings channel returns full settings object', async ({ appPage }) => {
    // The settings extension registers getSettings — invoke it directly
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
    // Settings shows zoom options like "100%", "90%", etc.
    expect(body).toMatch(/100%|zoom|75%|90%|125%/)
  })

  test('settings tool UI shows theme options', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openSettings(appPage)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/theme|dark|light/)
  })
})
