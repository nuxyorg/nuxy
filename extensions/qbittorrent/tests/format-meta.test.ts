import { describe, it, expect } from 'vitest'
import { formatItemMeta } from '../utils/format-meta.ts'
import type { TorrentItem } from '../types.ts'

function makeTorrent(overrides: Partial<TorrentItem> = {}): TorrentItem {
  return {
    hash: 'abc123',
    name: 'Ubuntu ISO',
    size: 4_000_000_000,
    progress: 0.5,
    dlspeed: 1024,
    upspeed: 0,
    eta: 3600,
    state: 'downloading',
    category: '',
    tags: '',
    savePath: '/downloads',
    magnetUri: 'magnet:?xt=urn:btih:abc123',
    ...overrides,
  }
}

describe('formatItemMeta', () => {
  it('returns the base status line when category and tags are empty', () => {
    const item = makeTorrent()
    expect(formatItemMeta(item, 'Downloading — 50% of 3.7 GB')).toBe('Downloading — 50% of 3.7 GB')
  })

  it('appends category when non-empty', () => {
    const item = makeTorrent({ category: 'linux' })
    expect(formatItemMeta(item, 'Downloading — 50%')).toBe('Downloading — 50% · linux')
  })

  it('appends comma-separated tags when non-empty', () => {
    const item = makeTorrent({ tags: 'iso,verified' })
    expect(formatItemMeta(item, 'Downloading — 50%')).toBe('Downloading — 50% · iso, verified')
  })

  it('appends both category and tags when both are set', () => {
    const item = makeTorrent({ category: 'linux', tags: 'iso,verified' })
    expect(formatItemMeta(item, 'Downloading — 50%')).toBe(
      'Downloading — 50% · linux · iso, verified'
    )
  })

  it('trims whitespace around tag entries', () => {
    const item = makeTorrent({ tags: ' iso , verified ' })
    expect(formatItemMeta(item, 'Downloading — 50%')).toBe('Downloading — 50% · iso, verified')
  })
})
