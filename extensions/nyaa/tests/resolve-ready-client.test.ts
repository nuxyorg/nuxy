import { describe, it, expect } from 'vitest'
import {
  parseInstalledExtensions,
  resolveReadyTorrentClientFromEntries,
} from '../utils/resolve-ready-client.ts'
import { listAddHandoffCandidates, type InstalledExtensionEntry } from '../utils/torrent-target.ts'

function entry(id: string, schemes?: string[], name?: string): InstalledExtensionEntry {
  return {
    id,
    manifest: { id, name, deeplinks: schemes ? { schemes } : undefined },
  }
}

describe('parseInstalledExtensions', () => {
  it('unwraps worker broker kernel payloads', () => {
    const rows = [entry('com.nuxy.qbittorrent', ['add'])]
    expect(parseInstalledExtensions({ success: true, data: rows })).toEqual(rows)
  })
})

describe('resolveReadyTorrentClientFromEntries', () => {
  it('picks the ready client among multiple add deeplink extensions', async () => {
    const entries = [
      entry('com.nuxy.download-manager', ['add'], 'Download Manager'),
      entry('com.nuxy.qbittorrent', ['add'], 'qBittorrent'),
    ]

    const ready = await resolveReadyTorrentClientFromEntries(entries, async (targetId) => {
      if (targetId === 'com.nuxy.qbittorrent') return { state: 'ready' }
      return null
    })

    expect(ready).toEqual({ targetId: 'com.nuxy.qbittorrent', name: 'qBittorrent' })
  })

  it('returns null when two add clients are both ready', async () => {
    const entries = [
      entry('com.nuxy.download-manager', ['add'], 'Download Manager'),
      entry('com.nuxy.qbittorrent', ['add'], 'qBittorrent'),
    ]

    const ready = await resolveReadyTorrentClientFromEntries(entries, async () => ({
      state: 'ready',
    }))
    expect(ready).toBeNull()
  })
})

describe('listAddHandoffCandidates', () => {
  it('lists every non-disabled extension that declares add', () => {
    expect(
      listAddHandoffCandidates([
        entry('com.nuxy.qbittorrent', ['add']),
        entry('com.nuxy.download-manager', ['add']),
      ])
    ).toHaveLength(2)
  })
})
