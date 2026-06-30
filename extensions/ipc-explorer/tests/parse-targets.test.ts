import { describe, it, expect } from 'vitest'
import {
  buildIpcTargets,
  flatChannels,
  kernelTarget,
  parseExtensionTargets,
} from '../utils/parse-targets.ts'

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
        ipcSamples: {},
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
        ipcSamples: {},
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
        ipcSamples: {},
        callable: false,
      },
    ])
  })

  it('reads ipc.samples from manifest', () => {
    const targets = parseExtensionTargets([
      {
        id: 'com.nuxy.qbittorrent',
        manifest: {
          name: 'qBittorrent',
          capabilities: { callable: true },
          ipc: {
            samples: {
              getStatus: {},
              add: { url: 'magnet:?xt=...' },
            },
          },
        },
        runtime: {
          ipcChannels: ['add', 'getStatus'],
          publicIpcChannels: ['add', 'getStatus'],
          privateIpcChannels: [],
        },
      },
    ])

    expect(targets[0]?.ipcSamples).toEqual({
      getStatus: {},
      add: { url: 'magnet:?xt=...' },
    })
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

  it('places extensions without public channels after those with public channels', () => {
    const targets = buildIpcTargets([
      {
        id: 'com.nuxy.theme-dark',
        manifest: { name: 'Dark' },
      },
      {
        id: 'com.nuxy.qbittorrent',
        manifest: { name: 'qBittorrent', capabilities: { callable: true } },
        runtime: {
          ipcChannels: ['add', 'getStatus'],
          publicIpcChannels: ['add', 'getStatus'],
          privateIpcChannels: [],
        },
      },
      {
        id: 'com.nuxy.notes',
        manifest: { name: 'Notes' },
        runtime: { ipcChannels: ['notes:list'] },
      },
      {
        id: 'com.nuxy.theme-light',
        manifest: { name: 'Light' },
      },
    ])

    expect(targets.map((target) => target.extId)).toEqual([
      'kernel',
      'com.nuxy.qbittorrent',
      'com.nuxy.theme-dark',
      'com.nuxy.theme-light',
      'com.nuxy.notes',
    ])
  })
})

describe('flatChannels', () => {
  it('lists public channels A–Z before private channels A–Z', () => {
    const target = {
      extId: 'com.nuxy.qbittorrent',
      name: 'qBittorrent',
      disabled: false,
      channels: ['list', 'add', 'getStatus', 'pause'],
      publicChannels: ['getStatus', 'add'],
      privateChannels: ['pause', 'list'],
      ipcSamples: {},
      callable: true,
    }

    expect(flatChannels(target)).toEqual([
      { channel: 'add', scope: 'public' },
      { channel: 'getStatus', scope: 'public' },
      { channel: 'list', scope: 'private' },
      { channel: 'pause', scope: 'private' },
    ])
  })
})
