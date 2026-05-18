import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerExtension,
  clearRegistry,
  getExtensionById,
  getExtensionFolder,
  resolveExtensionId,
  loadedExtensions
} from './registry.js'
import type { LoadedExtension } from '@nuxy/core'

const ext: LoadedExtension = {
  id: 'com.nuxy.clipboard',
  folderName: 'clipboard',
  manifest: {
    id: 'com.nuxy.clipboard',
    name: 'Clipboard',
    version: '1.0.0',
    type: 'tool'
  }
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
})
