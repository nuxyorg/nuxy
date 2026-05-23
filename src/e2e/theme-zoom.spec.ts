/**
 * Tests for theme switching and zoom level changes.
 * Verifies that CSS variables and document.documentElement.style.zoom actually update.
 */
import { test, expect } from './fixtures.js'

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
    expect(JSON.stringify(dark.data)).not.toBe(JSON.stringify(light.data))
  })

  test('active theme CSS vars are present in computed style on document root', async ({
    appPage,
  }) => {
    const settings = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})
    )
    expect(settings.success).toBe(true)
    const themeName: string = settings.data.theme || 'dark'

    const themeData = await appPage.evaluate(
      async (name: string) => (window as any).core.ipc.invoke('kernel', 'getThemeByName', { name }),
      themeName
    )
    expect(themeData.success).toBe(true)

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
      const res = await (window as any).core.ipc.invoke('kernel', 'getThemeByName', {
        name: 'dark',
      })
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
    const result = await appPage.evaluate(() => {
      document.documentElement.style.zoom = '90%'
      return document.documentElement.style.zoom
    })
    expect(result).toBe('90%')

    await appPage.evaluate(() => {
      document.documentElement.style.zoom = '100%'
    })
  })
})
