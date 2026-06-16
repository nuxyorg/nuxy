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
  mergeRuntimeSync,
  getDisplayName,
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
      displayName: 'Clip',
    })
    const loaded = getExtensionById('com.nuxy.clipboard')!
    expect(getDisplayName(loaded)).toBe('Clip')
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
