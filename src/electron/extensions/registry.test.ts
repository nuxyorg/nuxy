import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerExtension,
  clearRegistry,
  getExtensionById,
  getExtensionFolder,
  resolveExtensionId,
  loadedExtensions,
  setExtensionChannels,
  isChannelAllowed,
  isPublicChannel,
  isPrivateChannel,
  validateIpcSync,
  mergeRuntimeSync,
  getDisplayName,
  markFailed,
  clearFailed,
} from './registry.js'
import type { LoadedExtension } from '@nuxyorg/core'

const ext: LoadedExtension = {
  id: 'com.nuxy.clipboard',
  folderName: 'clipboard',
  manifest: {
    id: 'com.nuxy.clipboard',
    name: 'Clipboard',
    version: '1.0.0',
    type: 'tool',
  },
}

describe('registry', () => {
  beforeEach(() => {
    clearRegistry()
    registerExtension(ext)
  })

  it('registers by manifest id', () => {
    expect(getExtensionById('com.nuxy.clipboard')).toEqual(ext)
    expect(loadedExtensions).toHaveLength(1)
  })

  it('maps folder name to manifest id', () => {
    expect(resolveExtensionId('clipboard')).toBe('com.nuxy.clipboard')
    expect(getExtensionFolder('com.nuxy.clipboard')).toBe('clipboard')
  })

  it('maps the manifest id short name (last dot segment) to the full id, even when the folder name is versioned', () => {
    clearRegistry()
    registerExtension({
      id: 'com.nuxy.settings',
      folderName: 'com.nuxy.settings-1.0.0',
      manifest: { id: 'com.nuxy.settings', name: 'Settings', version: '1.0.0', type: 'tool' },
    })
    expect(resolveExtensionId('settings')).toBe('com.nuxy.settings')
  })

  it('clears between tests', () => {
    clearRegistry()
    expect(loadedExtensions).toHaveLength(0)
    expect(getExtensionById('com.nuxy.clipboard')).toBeUndefined()
  })

  it('tracks ipc channels from sync', () => {
    setExtensionChannels('com.nuxy.clipboard', ['getHistory'])
    expect(isChannelAllowed('com.nuxy.clipboard', 'getHistory')).toBe(true)
    expect(isChannelAllowed('com.nuxy.clipboard', 'other')).toBe(false)
  })

  it('merges runtime display name', () => {
    mergeRuntimeSync('com.nuxy.clipboard', {
      ipcChannels: ['eval'],
      privateIpcChannels: ['eval'],
      publicIpcChannels: [],
      displayName: 'Clip',
    })
    const loaded = getExtensionById('com.nuxy.clipboard')!
    expect(getDisplayName(loaded)).toBe('Clip')
  })

  it('splits private and public channels on sync and keeps the combined set for legacy isChannelAllowed', () => {
    mergeRuntimeSync('com.nuxy.clipboard', {
      ipcChannels: ['list', 'getStatus'],
      privateIpcChannels: ['list'],
      publicIpcChannels: ['getStatus'],
    })
    expect(isPrivateChannel('com.nuxy.clipboard', 'list')).toBe(true)
    expect(isPublicChannel('com.nuxy.clipboard', 'list')).toBe(false)
    expect(isPublicChannel('com.nuxy.clipboard', 'getStatus')).toBe(true)
    expect(isPrivateChannel('com.nuxy.clipboard', 'getStatus')).toBe(false)
    expect(isChannelAllowed('com.nuxy.clipboard', 'list')).toBe(true)
    expect(isChannelAllowed('com.nuxy.clipboard', 'getStatus')).toBe(true)
  })

  describe('validateIpcSync', () => {
    it('passes when public channels are a subset of manifest.ipc.public', () => {
      const result = validateIpcSync(
        'com.nuxy.qbittorrent',
        { public: ['getStatus', 'add'], samples: { getStatus: {}, add: { url: 'x' } } },
        { publicIpcChannels: ['getStatus'] }
      )
      expect(result.ok).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('fails when a registered public channel is not declared in the manifest', () => {
      const result = validateIpcSync(
        'com.nuxy.qbittorrent',
        { public: ['getStatus'] },
        { publicIpcChannels: ['getStatus', 'remove'] }
      )
      expect(result.ok).toBe(false)
      expect(result.errors).toEqual([
        'Channel "remove" registered public but not declared in manifest.ipc.public',
      ])
    })

    it('warns when a manifest-declared public channel has no registered handler', () => {
      const result = validateIpcSync(
        'com.nuxy.qbittorrent',
        { public: ['getStatus', 'add'], samples: { getStatus: {}, add: {} } },
        { publicIpcChannels: ['getStatus'] }
      )
      expect(result.ok).toBe(true)
      expect(result.warnings).toEqual([
        'Manifest declares public channel "add" with no registered public handler',
      ])
    })

    it('warns when a public channel has no ipc.samples entry', () => {
      const result = validateIpcSync(
        'com.nuxy.qbittorrent',
        { public: ['getStatus', 'add'], samples: { getStatus: {} } },
        { publicIpcChannels: ['getStatus', 'add'] }
      )
      expect(result.ok).toBe(true)
      expect(result.warnings).toContain(
        'Public channel "add" has no ipc.samples entry — add an example payload for IPC Explorer and cross-extension callers'
      )
    })

    it('warns when ipc.samples declares a channel not in ipc.public', () => {
      const result = validateIpcSync(
        'com.nuxy.qbittorrent',
        { public: ['getStatus'], samples: { getStatus: {}, add: {} } },
        { publicIpcChannels: ['getStatus'] }
      )
      expect(result.ok).toBe(true)
      expect(result.warnings).toContain(
        'ipc.samples declares "add" which is not listed in ipc.public'
      )
    })

    it('passes with no manifest public list when nothing is registered public', () => {
      const result = validateIpcSync('com.nuxy.clipboard', undefined, {
        publicIpcChannels: [],
      })
      expect(result.ok).toBe(true)
      expect(result.errors).toEqual([])
      expect(result.warnings).toEqual([])
    })
  })

  it('marks an extension as failed with a reason', () => {
    markFailed('com.nuxy.clipboard', 'worker crashed')
    const ext = getExtensionById('com.nuxy.clipboard')!
    expect(ext.status).toBe('failed')
    expect(ext.lastError).toBe('worker crashed')
  })

  it('clears a failed status', () => {
    markFailed('com.nuxy.clipboard', 'worker crashed')
    clearFailed('com.nuxy.clipboard')
    const ext = getExtensionById('com.nuxy.clipboard')!
    expect(ext.status).toBeUndefined()
    expect(ext.lastError).toBeUndefined()
  })

  it('is a no-op for an unknown extension id', () => {
    expect(() => markFailed('unknown', 'oops')).not.toThrow()
    expect(() => clearFailed('unknown')).not.toThrow()
  })

  it('prefers a higher-scored duplicate registration for the same extension id', () => {
    const duplicate: LoadedExtension = {
      id: 'com.nuxy.clipboard',
      folderName: '.tmp_clipboard',
      manifest: {
        id: 'com.nuxy.clipboard',
        name: 'Clipboard',
        version: '1.0.0',
        type: 'tool',
      },
    }
    registerExtension(duplicate)
    expect(loadedExtensions).toHaveLength(1)
    expect(loadedExtensions[0].folderName).toBe('clipboard')
  })
})
