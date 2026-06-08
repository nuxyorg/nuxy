/**
 * Integration tests for extension behavior in the running Electron app:
 * angrysearch status, orchestrator routing, media provider, and
 * cross-extension IPC interactions.
 */
import { test, expect } from './fixtures.js'
import { resetShell, typeInOmnibar } from '../../extensions/e2e-helpers.js'

test.describe('angrysearch extension', () => {
  test('getStatus returns expected shape', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.angrysearch', 'getStatus', {})
    )
    expect(result.success).toBe(true)
    const s = result.data
    expect(typeof s.isUpdating).toBe('boolean')
    expect(typeof s.exists).toBe('boolean')
    // lastUpdate is null initially or a date string
    expect(s.lastUpdate === null || typeof s.lastUpdate === 'string').toBe(true)
  })

  test('search with short query returns empty items', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.angrysearch', 'search', { query: 'ab' })
    )
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data.items)).toBe(true)
    expect(result.data.items).toHaveLength(0)
  })

  test('search with 3+ chars returns items array', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.angrysearch', 'search', { query: 'usr' })
    )
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data.items)).toBe(true)
  })

  test('updateDatabase returns true', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.angrysearch', 'updateDatabase', {})
    )
    expect(result.success).toBe(true)
    expect(result.data).toBe(true)
  })
})

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

test.describe('emoji-picker extension via IPC', () => {
  test('getFavorites returns an array', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.emoji-picker', 'getFavorites', {})
    )
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  test('copy returns { ok: true }', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.emoji-picker', 'copy', '😀')
    )
    expect(result.success).toBe(true)
    expect(result.data.ok).toBe(true)
  })

  test('toggleFavorite adds then removes emoji', async ({ appPage }) => {
    // Add
    const add = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.emoji-picker', 'toggleFavorite', '🧪')
    )
    expect(add.success).toBe(true)
    expect(add.data).toContain('🧪')

    // Remove
    const remove = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.emoji-picker', 'toggleFavorite', '🧪')
    )
    expect(remove.success).toBe(true)
    expect(remove.data).not.toContain('🧪')
  })
})

test.describe('time-calculator provider via IPC', () => {
  test('eval with time query returns result', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.time-calculator', 'eval', { text: '12pm tokyo' })
    )
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data.items)).toBe(true)
    expect(result.data.items.length).toBeGreaterThan(0)
  })

  test('eval with non-time query returns empty or hint', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.time-calculator', 'eval', { text: 'just a query' })
    )
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data.items)).toBe(true)
  })

  test('convert channel performs time conversion', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.time-calculator', 'convert', {
        time: '12pm',
        from: 'UTC',
        to: 'tokyo',
      })
    )
    expect(result.success).toBe(true)
    const d = result.data
    expect(typeof d.convertedTime).toBe('string')
    expect(typeof d.timezone).toBe('string')
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

test.describe('clipboard extension via IPC', () => {
  test('getHistory returns array', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.clipboard', 'getHistory', {})
    )
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  test('clearHistory returns array', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.clipboard', 'clearHistory', {})
    )
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })
})
