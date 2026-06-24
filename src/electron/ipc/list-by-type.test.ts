import { describe, it, expect, beforeEach } from 'vitest'
import { extensionMatchesListKind, listExtensionsByKind } from './list-by-type.js'
import { clearRegistry, registerExtension, mergeRuntimeSync } from '../extensions/registry.js'
import type { LoadedExtension } from '@nuxyorg/core'

const makeExt = (
  id: string,
  type: LoadedExtension['manifest']['type'],
  overrides: Partial<LoadedExtension> = {}
): LoadedExtension => ({
  id,
  folderName: id.split('.').pop() ?? id,
  manifest: { id, name: id, version: '1.0.0', type },
  ...overrides,
})

describe('extensionMatchesListKind', () => {
  it('uses manifest.type when runtime has no registeredEntries', () => {
    const ext = makeExt('com.nuxy.calc', 'provider')
    expect(extensionMatchesListKind(ext, 'provider')).toBe(true)
    expect(extensionMatchesListKind(ext, 'tool')).toBe(false)
  })

  it('uses registeredEntries when present', () => {
    const ext = makeExt('com.nuxy.notes', 'tool', {
      runtime: {
        ipcChannels: ['eval'],
        privateIpcChannels: ['eval'],
        publicIpcChannels: [],
        registeredEntries: [
          { kind: 'tool', name: 'notes' },
          { kind: 'provider', name: 'notes' },
        ],
      },
    })
    expect(extensionMatchesListKind(ext, 'tool')).toBe(true)
    expect(extensionMatchesListKind(ext, 'provider')).toBe(true)
    expect(extensionMatchesListKind(ext, 'orchestrator')).toBe(false)
  })

  it('ignores manifest.type when registeredEntries is non-empty', () => {
    const ext = makeExt('com.nuxy.converter', 'tool', {
      runtime: {
        ipcChannels: ['eval'],
        privateIpcChannels: ['eval'],
        publicIpcChannels: [],
        registeredEntries: [{ kind: 'provider', name: 'converter' }],
      },
    })
    expect(extensionMatchesListKind(ext, 'provider')).toBe(true)
    expect(extensionMatchesListKind(ext, 'tool')).toBe(false)
  })

  it('falls back to manifest when registeredEntries is empty', () => {
    const ext = makeExt('com.nuxy.calc', 'provider', {
      runtime: {
        ipcChannels: [],
        privateIpcChannels: [],
        publicIpcChannels: [],
        registeredEntries: [],
      },
    })
    expect(extensionMatchesListKind(ext, 'provider')).toBe(true)
    expect(extensionMatchesListKind(ext, 'tool')).toBe(false)
  })
})

describe('listExtensionsByKind', () => {
  beforeEach(() => clearRegistry())

  it('excludes disabled and bootstrap extensions', () => {
    registerExtension(
      makeExt('com.nuxy.shell', 'uikit', {
        manifest: {
          id: 'com.nuxy.shell',
          name: 'Shell',
          version: '1.0.0',
          type: 'uikit',
          bootstrap: true,
        },
      })
    )
    registerExtension(makeExt('com.nuxy.off', 'tool', { disabled: true }))
    registerExtension(makeExt('com.nuxy.on', 'tool'))

    const tools = listExtensionsByKind('tool')
    expect(tools.map((e) => e.id)).toEqual(['com.nuxy.on'])
  })

  it('lists dual-role extensions in both tool and provider results', () => {
    registerExtension(makeExt('com.nuxy.notes', 'tool'))
    mergeRuntimeSync('com.nuxy.notes', {
      ipcChannels: ['eval'],
      privateIpcChannels: ['eval'],
      publicIpcChannels: [],
      registeredEntries: [
        { kind: 'tool', name: 'notes' },
        { kind: 'provider', name: 'notes' },
      ],
    })

    const toolIds = listExtensionsByKind('tool').map((e) => e.id)
    const providerIds = listExtensionsByKind('provider').map((e) => e.id)
    expect(toolIds).toContain('com.nuxy.notes')
    expect(providerIds).toContain('com.nuxy.notes')
  })

  it('does not use hardcoded extension ids', () => {
    registerExtension(makeExt('com.example.dual', 'provider'))
    mergeRuntimeSync('com.example.dual', {
      ipcChannels: [],
      privateIpcChannels: [],
      publicIpcChannels: [],
      registeredEntries: [
        { kind: 'tool', name: 'dual' },
        { kind: 'provider', name: 'dual' },
      ],
    })

    expect(listExtensionsByKind('tool').map((e) => e.id)).toContain('com.example.dual')
    expect(listExtensionsByKind('provider').map((e) => e.id)).toContain('com.example.dual')
  })
})
