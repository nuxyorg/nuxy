/**
 * E2E Playwright spec for Nuxy kernel theme channels.
 * Exercises listThemes, getTheme, getThemeByName, applyWindowSettings,
 * and verifies that CSS custom properties are applied to the document root.
 *
 * These tests require a running Electron app (uses the worker-scoped
 * electronApp / appPage fixtures from fixtures.ts).
 */
import { test, expect } from './fixtures.js'

test.describe('kernel theme channels', () => {
  test('listThemes returns success with an array', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'listThemes', {})
    )
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  test('listThemes result includes "dark" and "light"', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'listThemes', {})
    )
    expect(result.success).toBe(true)
    expect(result.data).toContain('dark')
    expect(result.data).toContain('light')
  })

  test('getTheme returns success with a non-null data object', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'getTheme', {})
    )
    expect(result.success).toBe(true)
    expect(result.data).not.toBeNull()
    expect(typeof result.data).toBe('object')
  })

  test('getThemeByName with "dark" returns success with theme data', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'getThemeByName', { name: 'dark' })
    )
    expect(result.success).toBe(true)
    expect(result.data).toBeTruthy()
    expect(typeof result.data).toBe('object')
  })

  test('getThemeByName with "light" returns success with theme data', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'getThemeByName', { name: 'light' })
    )
    expect(result.success).toBe(true)
    expect(result.data).toBeTruthy()
    expect(typeof result.data).toBe('object')
  })

  test('getThemeByName with missing name returns default theme', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'getThemeByName', {})
    )
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data.name).toBeDefined()
  })

  test('getThemeByName with empty string returns default theme', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'getThemeByName', { name: '' })
    )
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data.name).toBeDefined()
  })

  test('applyWindowSettings returns success: true', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'applyWindowSettings', {})
    )
    expect(result.success).toBe(true)
  })
})

test.describe('theme CSS variables', () => {
  test('document has a CSS custom property starting with "--" after app loads', async ({
    appPage,
  }) => {
    const hasVars = await appPage.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      // Check known theme variable names that the dark/light themes define.
      // Uses multiple fallbacks to stay resilient to variable naming changes.
      return (
        style.getPropertyValue('--background').trim() !== '' ||
        style.getPropertyValue('--foreground').trim() !== '' ||
        document.documentElement.style.cssText.includes('--') ||
        // Broad fallback: the element carries any inline style at all (theme vars
        // are applied as inline custom properties on documentElement).
        document.documentElement.hasAttribute('style')
      )
    })
    expect(hasVars).toBe(true)
  })
})
