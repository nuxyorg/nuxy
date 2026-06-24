import { describe, it, expect, beforeEach } from 'vitest'
import { validateExtInvokeArgs, validateWindowResize } from './validate.js'
import {
  registerExtension,
  clearRegistry,
  setExtensionChannels,
  mergeRuntimeSync,
} from '../extensions/registry.js'
import type { LoadedExtension } from '@nuxyorg/core'

const sampleExt: LoadedExtension = {
  id: 'com.nuxy.test',
  folderName: 'test',
  manifest: {
    id: 'com.nuxy.test',
    name: 'Test',
    version: '1.0.0',
    type: 'tool',
    capabilities: { callable: true, caller: false },
  },
}

const otherExt: LoadedExtension = {
  id: 'com.nuxy.other',
  folderName: 'other',
  manifest: {
    id: 'com.nuxy.other',
    name: 'Other',
    version: '1.0.0',
    type: 'tool',
    capabilities: { callable: false, caller: true },
  },
}

describe('validateExtInvokeArgs', () => {
  beforeEach(() => {
    clearRegistry()
    registerExtension(sampleExt)
    registerExtension(otherExt)
    setExtensionChannels('com.nuxy.test', ['eval', 'secretPrivate'])
    mergeRuntimeSync('com.nuxy.test', {
      ipcChannels: ['eval', 'secretPrivate'],
      privateIpcChannels: ['secretPrivate'],
      publicIpcChannels: ['eval'],
    })
  })

  it('rejects empty extId', () => {
    const r = validateExtInvokeArgs('', 'eval', {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.result.code).toBe('INVALID_ARGS')
  })

  it('allows kernel listTools', () => {
    const r = validateExtInvokeArgs('kernel', 'listTools', {})
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.extId).toBe('kernel')
      expect(r.channel).toBe('listTools')
    }
  })

  it('allows kernel listUikitExtensions', () => {
    const r = validateExtInvokeArgs('kernel', 'listUikitExtensions', {})
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.channel).toBe('listUikitExtensions')
  })

  it('allows kernel getExtensionSettingsSchemas', () => {
    const r = validateExtInvokeArgs('kernel', 'getExtensionSettingsSchemas', {})
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.channel).toBe('getExtensionSettingsSchemas')
  })

  it('allows kernel listPreloads', () => {
    const r = validateExtInvokeArgs('kernel', 'getPreloads', {})
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.channel).toBe('getPreloads')
  })

  it('allows kernel listInstalledExtensions', () => {
    const r = validateExtInvokeArgs('kernel', 'listInstalledExtensions', {})
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.channel).toBe('listInstalledExtensions')
  })

  it('allows kernel installExtension', () => {
    const r = validateExtInvokeArgs('kernel', 'installExtension', {
      downloadUrl: 'https://example.com',
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.channel).toBe('installExtension')
  })

  it('allows kernel uninstallExtension', () => {
    const r = validateExtInvokeArgs('kernel', 'uninstallExtension', { extId: 'com.nuxy.test' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.channel).toBe('uninstallExtension')
  })

  it('allows kernel validateCompositionClaim', () => {
    const r = validateExtInvokeArgs('kernel', 'validateCompositionClaim', {
      extId: 'com.nuxy.gradient',
      slotName: 'background-layer',
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.channel).toBe('validateCompositionClaim')
  })

  it('allows kernel getToolElementTag', () => {
    const r = validateExtInvokeArgs('kernel', 'getToolElementTag', { extId: 'com.nuxy.test' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.channel).toBe('getToolElementTag')
  })

  it('rejects unknown kernel channel', () => {
    const r = validateExtInvokeArgs('kernel', 'deleteEverything', {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.result.code).toBe('UNKNOWN_CHANNEL')
  })

  it('rejects unregistered extension', () => {
    const r = validateExtInvokeArgs('com.nuxy.missing', 'eval', {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.result.code).toBe('EXTENSION_NOT_FOUND')
  })

  it('allows registered extension invoke', () => {
    const r = validateExtInvokeArgs('com.nuxy.test', 'eval', { text: 'hi' })
    expect(r.ok).toBe(true)
  })

  it('rejects unregistered channel on extension', () => {
    const r = validateExtInvokeArgs('com.nuxy.test', 'secret', {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.result.code).toBe('UNKNOWN_CHANNEL')
  })

  it('allows same-extension invoke of a private channel when callerExtId matches target', () => {
    const r = validateExtInvokeArgs('com.nuxy.test', 'secretPrivate', {}, 'com.nuxy.test')
    expect(r.ok).toBe(true)
  })

  it('allows a cross-extension call to a public channel when target is callable', () => {
    const r = validateExtInvokeArgs('com.nuxy.test', 'eval', {}, 'com.nuxy.other')
    expect(r.ok).toBe(true)
  })

  it('denies a cross-extension call to a private channel with IPC_PRIVATE', () => {
    const r = validateExtInvokeArgs('com.nuxy.test', 'secretPrivate', {}, 'com.nuxy.other')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.result.code).toBe('IPC_PRIVATE')
  })

  it('requires callerExtId for private channels', () => {
    const r = validateExtInvokeArgs('com.nuxy.test', 'secretPrivate', {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.result.code).toBe('CALLER_REQUIRED')
  })

  it('allows public channels without callerExtId', () => {
    const r = validateExtInvokeArgs('com.nuxy.test', 'eval', {})
    expect(r.ok).toBe(true)
  })
})

describe('validateWindowResize', () => {
  it('accepts finite numbers', () => {
    const r = validateWindowResize(400, 200)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.width).toBe(400)
      expect(r.height).toBe(200)
    }
  })

  it('rejects NaN', () => {
    expect(validateWindowResize(NaN, 100).ok).toBe(false)
  })

  it('rejects non-numbers', () => {
    expect(validateWindowResize('400', 100).ok).toBe(false)
  })
})
