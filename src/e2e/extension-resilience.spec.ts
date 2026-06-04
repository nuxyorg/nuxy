/**
 * Extension error resilience e2e tests.
 *
 * These tests verify that invalid or malformed IPC calls are handled gracefully
 * and — crucially — that the app remains fully responsive after each error.
 * They complement the unit-style validation tests in kernel-channels.spec.ts and
 * the basic error-shape coverage in ipc-bridge.spec.ts by focusing on
 * liveness: can the app still serve good requests after a bad one?
 *
 * All calls go through window.core.ipc.invoke in the renderer, exercising the
 * full contextBridge → ipcMain → validateExtInvokeArgs path.
 */
import { test, expect } from './fixtures.js'

// ---------------------------------------------------------------------------
// Helper: assert that the app is still alive and responsive.
// Checks both the IPC layer (a real kernel round-trip) and the DOM.
// ---------------------------------------------------------------------------
async function assertAppHealthy(appPage: any) {
  const health = await appPage.evaluate(async () =>
    (window as any).core.ipc.invoke('kernel', 'listTools', {})
  )
  expect(health.success).toBe(true)
  expect(Array.isArray(health.data)).toBe(true)

  await appPage.waitForSelector('input', { timeout: 400 })
}

// ---------------------------------------------------------------------------
// Unknown extension
// ---------------------------------------------------------------------------
test.describe('unknown extension graceful error', () => {
  test('invoking a nonexistent extension returns success: false with EXTENSION_NOT_FOUND', async ({
    appPage,
  }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.nonexistent', 'someChannel', {})
    )
    expect(result.success).toBe(false)
    expect(result.code).toBe('EXTENSION_NOT_FOUND')
    expect(typeof result.error).toBe('string')
  })

  test('app remains responsive after invoking a nonexistent extension', async ({ appPage }) => {
    // Produce the error
    await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.nonexistent', 'someChannel', {})
    )

    // The app must still honour well-formed requests
    await assertAppHealthy(appPage)
  })
})

// ---------------------------------------------------------------------------
// Invalid channel on a valid extension
// ---------------------------------------------------------------------------
test.describe('invalid channel graceful error', () => {
  test('invoking an unknown channel on com.nuxy.calculator returns success: false', async ({
    appPage,
  }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.calculator', 'doesNotExist', {})
    )
    expect(result.success).toBe(false)
    // The validator returns UNKNOWN_CHANNEL when the channel is not in the allowlist
    expect(result.code).toBe('UNKNOWN_CHANNEL')
  })

  test('app remains responsive after an invalid channel call', async ({ appPage }) => {
    await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.calculator', 'doesNotExist', {})
    )

    await assertAppHealthy(appPage)
  })
})

// ---------------------------------------------------------------------------
// Input validation edge cases
// ---------------------------------------------------------------------------
test.describe('input validation', () => {
  test('empty extId is rejected with INVALID_ARGS', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('', 'someChannel', {})
    )
    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_ARGS')
  })

  test('whitespace-only extId is rejected with INVALID_ARGS', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('   ', 'someChannel', {})
    )
    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_ARGS')
  })

  test('empty channel is rejected with INVALID_ARGS', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.calculator', '', {})
    )
    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_ARGS')
  })

  test('kernel with a completely unknown channel returns UNKNOWN_CHANNEL without crashing', async ({
    appPage,
  }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'totallyFakeChannel', {})
    )
    expect(result.success).toBe(false)
    expect(result.code).toBe('UNKNOWN_CHANNEL')

    // App must still be alive
    await assertAppHealthy(appPage)
  })

  test('error response has the expected shape (success, error, code)', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.ghost', 'ping', {})
    )
    // All error responses must carry at minimum { success: false }
    expect(typeof result).toBe('object')
    expect(result.success).toBe(false)
    expect(typeof result.error).toBe('string')
    expect(typeof result.code).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// App health after a sequence of error-producing calls
// ---------------------------------------------------------------------------
test.describe('app health after errors', () => {
  test('known kernel channels still work after a series of bad calls', async ({ appPage }) => {
    // 1. Three consecutive error-producing calls of different failure kinds
    await appPage.evaluate(async () => {
      const c = (window as any).core.ipc
      await c.invoke('com.nuxy.nonexistent', 'someChannel', {}) // EXTENSION_NOT_FOUND
      await c.invoke('com.nuxy.calculator', 'doesNotExist', {}) // UNKNOWN_CHANNEL
      await c.invoke('', 'someChannel', {}) // INVALID_ARGS
    })

    // 2. A real kernel call must succeed immediately after
    const listTools = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'listTools', {})
    )
    expect(listTools.success).toBe(true)
    expect(Array.isArray(listTools.data)).toBe(true)

    // 3. A second distinct kernel call to rule out a lucky single hit
    const listProviders = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'listProviders', {})
    )
    expect(listProviders.success).toBe(true)
    expect(Array.isArray(listProviders.data)).toBe(true)

    // 4. DOM must still be reachable
    await appPage.waitForSelector('input', { timeout: 400 })
  })

  test('repeated invocations of the same bad call do not degrade the app', async ({ appPage }) => {
    // Hit the same invalid call ten times in a row
    await appPage.evaluate(async () => {
      const c = (window as any).core.ipc
      for (let i = 0; i < 10; i++) {
        await c.invoke('com.nuxy.nonexistent', 'ping', {})
      }
    })

    await assertAppHealthy(appPage)
  })

  test('concurrent bad calls do not crash the app', async ({ appPage }) => {
    // Fire several bad calls in parallel (Promise.all)
    const results = await appPage.evaluate(async () => {
      const c = (window as any).core.ipc
      return Promise.all([
        c.invoke('com.nuxy.nonexistent', 'a', {}),
        c.invoke('com.nuxy.calculator', 'nope', {}),
        c.invoke('', 'b', {}),
        c.invoke('kernel', 'ghostChannel', {}),
      ])
    })

    // Every result must be a graceful error — no undefined, no throws
    for (const r of results) {
      expect(typeof r).toBe('object')
      expect(r.success).toBe(false)
    }

    await assertAppHealthy(appPage)
  })

  test('calculator still evaluates correctly after error calls targeting it', async ({
    appPage,
  }) => {
    // Poison the extension with an invalid channel first
    await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.calculator', 'doesNotExist', {})
    )

    // Then confirm the legitimate channel still works
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.calculator', 'eval', { text: '3+3' })
    )
    expect(result.success).toBe(true)
    expect(result.data.items[0].value).toBe(6)
  })
})
