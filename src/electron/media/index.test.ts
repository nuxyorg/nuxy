import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NowPlaying } from './types.js'

const mockGetNowPlaying = vi.fn<() => Promise<NowPlaying | null>>()

vi.mock('./platforms/index.js', () => ({
  createPlatformMediaProvider: () => ({
    platform: 'linux',
    getNowPlaying: mockGetNowPlaying,
  }),
}))

// Import after mock so the module picks up the mocked provider
const { getNowPlaying, platformId, setMediaProvider } = await import('./index.js')

describe('platformId', () => {
  it('returns the platform of the active provider', () => {
    expect(platformId()).toBe('linux')
  })
})

describe('getNowPlaying', () => {
  beforeEach(() => {
    mockGetNowPlaying.mockReset()
  })

  it('returns null when no media is playing', async () => {
    mockGetNowPlaying.mockResolvedValue(null)
    await expect(getNowPlaying()).resolves.toBeNull()
  })

  it('returns NowPlaying data from the provider', async () => {
    const track: NowPlaying = {
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      playing: true,
      source: 'spotify',
    }
    mockGetNowPlaying.mockResolvedValue(track)
    const result = await getNowPlaying()
    expect(result).toEqual(track)
  })

  it('propagates provider rejection as a rejected promise', async () => {
    mockGetNowPlaying.mockRejectedValue(new Error('dbus error'))
    await expect(getNowPlaying()).rejects.toThrow('dbus error')
  })
})

describe('setMediaProvider', () => {
  afterEach(() => {
    // Restore default mock provider
    setMediaProvider({ platform: 'linux', getNowPlaying: mockGetNowPlaying })
  })

  it('swaps the active provider so platformId reflects new platform', () => {
    setMediaProvider({ platform: 'darwin', getNowPlaying: vi.fn().mockResolvedValue(null) })
    expect(platformId()).toBe('darwin')
  })

  it('getNowPlaying uses the new provider after swap', async () => {
    const fakeTrack: NowPlaying = { title: 'Switched', playing: false, source: 'test' }
    setMediaProvider({
      platform: 'win32',
      getNowPlaying: vi.fn().mockResolvedValue(fakeTrack),
    })
    const result = await getNowPlaying()
    expect(result?.title).toBe('Switched')
  })

  it('setting provider to unsupported returns null from getNowPlaying', async () => {
    setMediaProvider({ platform: 'unsupported', getNowPlaying: async () => null })
    await expect(getNowPlaying()).resolves.toBeNull()
  })
})
