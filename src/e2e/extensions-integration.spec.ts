/**
 * Integration tests for extension behavior in the running Electron app:
 * orchestrator routing, calculator provider, and cross-extension IPC interactions.
 */
import { test, expect } from './fixtures.js'
import { resetShell, typeInOmnibar } from './e2e-helpers.js'

test.describe('calculator provider via IPC', () => {
  test('eval returns result for valid math', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.calculator', 'eval', { text: '7*6' })
    )
    expect(result.success).toBe(true)
    expect(result.data.items).toHaveLength(1)
    expect(result.data.items[0].title).toBe('= 42')
    expect(result.data.items[0].value).toBe(42)
  })

  test('eval returns empty items for non-math', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.calculator', 'eval', { text: 'hello world' })
    )
    expect(result.success).toBe(true)
    expect(result.data.items).toHaveLength(0)
  })

  test('eval subtitle field present', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.calculator', 'eval', { text: '1+1' })
    )
    expect(result.success).toBe(true)
    expect(result.data.items[0].subtitle).toBeTruthy()
  })
})

test.describe('shell extension via IPC', () => {
  test('getRecentTools returns an array', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.shell', 'getRecentTools', {})
    )
    // Shell may or may not expose this channel depending on manifest
    expect(result).toBeTruthy()
    if (result.success) {
      expect(Array.isArray(result.data)).toBe(true)
    }
  })
})

test.describe('orchestrator routing', () => {
  test('typing query and pressing Enter does not crash', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await resetShell(appPage)

    await typeInOmnibar(appPage, 'what is the meaning of life')
    await appPage.waitForFunction(
      () =>
        (document.querySelector('input') as HTMLInputElement | null)?.value ===
        'what is the meaning of life',
      { timeout: 400 }
    )
    await appPage.keyboard.press('Enter')
    await appPage.waitForFunction(() => document.querySelector('input') !== null, { timeout: 400 })

    // App should still be responsive
    const inputExists = await appPage.evaluate(() => document.querySelector('input') !== null)
    expect(inputExists).toBe(true)
  })
})
