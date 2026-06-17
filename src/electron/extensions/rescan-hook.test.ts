import { describe, it, expect, vi } from 'vitest'

describe('rescan-hook', () => {
  it('resolves to undefined as a no-op when no function was registered', async () => {
    vi.resetModules()
    const { invokeRescan } = await import('./rescan-hook.js')

    const result = await invokeRescan()

    expect(result).toBeUndefined()
  })

  it('calls and awaits the registered function', async () => {
    vi.resetModules()
    const { setRescanFn, invokeRescan } = await import('./rescan-hook.js')
    let called = false
    setRescanFn(async () => {
      await Promise.resolve()
      called = true
    })

    await invokeRescan()

    expect(called).toBe(true)
  })

  it('replaces a previously registered function', async () => {
    vi.resetModules()
    const { setRescanFn, invokeRescan } = await import('./rescan-hook.js')
    const calls: string[] = []
    setRescanFn(async () => {
      calls.push('first')
    })
    setRescanFn(async () => {
      calls.push('second')
    })

    await invokeRescan()

    expect(calls).toEqual(['second'])
  })

  it('resolves to undefined even if the registered fn returns a value', async () => {
    vi.resetModules()
    const { setRescanFn, invokeRescan } = await import('./rescan-hook.js')
    setRescanFn(async () => undefined)

    await expect(invokeRescan()).resolves.toBeUndefined()
  })
})
