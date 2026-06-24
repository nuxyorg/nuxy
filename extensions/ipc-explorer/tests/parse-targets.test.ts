import { describe, it, expect } from 'vitest'
import { buildIpcTargets, kernelTarget, parseExtensionTargets } from '../utils/parse-targets.ts'

describe('parseExtensionTargets', () => {
  it('splits public and private channels when runtime reports them', () => {
    const targets = parseExtensionTargets([
      {
        id: 'com.nuxy.qbittorrent',
        manifest: { name: 'qBittorrent', capabilities: { callable: true } },
        runtime: {
          ipcChannels: ['add', 'list', 'getStatus', 'pause'],
          publicIpcChannels: ['add', 'getStatus'],
          privateIpcChannels: ['list', 'pause'],
        },
      },
    ])

    expect(targets).toEqual([
      {
        extId: 'com.nuxy.qbittorrent',
        name: 'qBittorrent',
        disabled: false,
        channels: ['add', 'getStatus', 'list', 'pause'],
        publicChannels: ['add', 'getStatus'],
        privateChannels: ['list', 'pause'],
        callable: true,
      },
    ])
  })

  it('treats all channels as private when the runtime sync has no public/private split (legacy)', () => {
    const targets = parseExtensionTargets([
      {
        id: 'com.nuxy.notes',
        manifest: { name: 'Notes' },
        runtime: { ipcChannels: ['notes:list'] },
      },
    ])

    expect(targets).toEqual([
      {
        extId: 'com.nuxy.notes',
        name: 'Notes',
        disabled: false,
        channels: ['notes:list'],
        publicChannels: [],
        privateChannels: ['notes:list'],
        callable: false,
      },
    ])
  })

  it('skips invalid entries but keeps extensions without channels', () => {
    expect(
      parseExtensionTargets([{ id: 'com.nuxy.theme-dark', manifest: { name: 'Dark' } }, null])
    ).toEqual([
      {
        extId: 'com.nuxy.theme-dark',
        name: 'Dark',
        disabled: false,
        channels: [],
        publicChannels: [],
        privateChannels: [],
        callable: false,
      },
    ])
  })
})

describe('kernelTarget', () => {
  it('includes listInstalledExtensions', () => {
    expect(kernelTarget().channels).toContain('listInstalledExtensions')
  })
})

describe('buildIpcTargets', () => {
  it('prepends kernel before extension targets', () => {
    const targets = buildIpcTargets([
      {
        id: 'com.nuxy.qbittorrent',
        manifest: { name: 'qBittorrent' },
        runtime: { ipcChannels: ['add', 'getStatus'] },
      },
    ])

    expect(targets[0]?.extId).toBe('kernel')
    expect(targets[1]?.extId).toBe('com.nuxy.qbittorrent')
  })
})
