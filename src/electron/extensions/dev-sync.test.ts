import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { startExtensionDirectoryWatcher, invokeRescan } = vi.hoisted(() => ({
  startExtensionDirectoryWatcher: vi.fn(),
  invokeRescan: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./extension-reload.js', () => ({
  startExtensionDirectoryWatcher,
}))

vi.mock('./rescan-hook.js', () => ({
  invokeRescan,
}))

import { startExtensionWatcher } from './dev-sync.js'

describe('startExtensionWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('delegates to startExtensionDirectoryWatcher with the current DEV flag', () => {
    startExtensionWatcher()

    expect(startExtensionDirectoryWatcher).toHaveBeenCalledTimes(1)
    const [isDev, onRescan] = startExtensionDirectoryWatcher.mock.calls[0]
    expect(typeof isDev).toBe('boolean')
    expect(typeof onRescan).toBe('function')
  })

  it('invokes the rescan hook when the dev-mode rescan callback fires', () => {
    startExtensionWatcher()
    const onRescan = startExtensionDirectoryWatcher.mock.calls[0][1] as () => void

    onRescan()

    expect(invokeRescan).toHaveBeenCalledTimes(1)
  })
})
