import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPlatformMediaProvider } from './index.js'

describe('createPlatformMediaProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('selects linux backend on linux', () => {
    vi.stubGlobal('process', { ...process, platform: 'linux' })
    expect(createPlatformMediaProvider().platform).toBe('linux')
  })

  it('selects darwin stub on darwin', () => {
    vi.stubGlobal('process', { ...process, platform: 'darwin' })
    expect(createPlatformMediaProvider().platform).toBe('darwin')
  })

  it('selects win32 stub on win32', () => {
    vi.stubGlobal('process', { ...process, platform: 'win32' })
    expect(createPlatformMediaProvider().platform).toBe('win32')
  })
})
