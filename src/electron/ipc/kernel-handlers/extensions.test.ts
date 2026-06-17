import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LoadedExtension } from '@nuxyorg/core'

const loadedExtensions: LoadedExtension[] = vi.hoisted(() => [])

vi.mock('../../extensions/scanner.js', () => ({
  loadedExtensions,
}))

vi.mock('../../extensions/disabled.js', () => ({
  setExtensionEnabled: vi.fn(),
}))

vi.mock('../../extensions/rescan-hook.js', () => ({
  invokeRescan: vi.fn(async () => {}),
}))

vi.mock('../../extensions/registry.js', () => ({
  getDisplayName: vi.fn((ext: LoadedExtension) => ext.manifest.name),
}))

vi.mock('../list-by-type.js', () => ({
  listExtensionsByKind: vi.fn(() => []),
  listUikitExtensions: vi.fn(() => []),
}))

vi.mock('../extension-ops.js', () => ({
  kernelInstallExtension: vi.fn(async () => ({ success: true })),
  kernelUninstallExtension: vi.fn(() => ({ success: true })),
}))

import { extensionHandlers } from './extensions.js'
import { listExtensionsByKind, listUikitExtensions } from '../list-by-type.js'
import { setExtensionEnabled } from '../../extensions/disabled.js'
import { invokeRescan } from '../../extensions/rescan-hook.js'
import { kernelInstallExtension, kernelUninstallExtension } from '../extension-ops.js'

function makeExt(overrides: Partial<LoadedExtension> = {}): LoadedExtension {
  return {
    id: 'com.example.ext',
    folderName: 'ext',
    manifest: { id: 'com.example.ext', name: 'Ext', version: '1.0.0', type: 'tool' },
    ...overrides,
  } as LoadedExtension
}

describe('extensionHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadedExtensions.length = 0
  })

  describe('listTools', () => {
    it('returns tools from listExtensionsByKind', () => {
      const ext = makeExt()
      vi.mocked(listExtensionsByKind).mockReturnValue([ext])
      const result = extensionHandlers.listTools(undefined)
      expect(result).toEqual({ success: true, data: [ext] })
      expect(listExtensionsByKind).toHaveBeenCalledWith('tool')
    })
  })

  describe('listProviders', () => {
    it('returns providers from listExtensionsByKind', () => {
      vi.mocked(listExtensionsByKind).mockReturnValue([])
      const result = extensionHandlers.listProviders(undefined)
      expect(result).toEqual({ success: true, data: [] })
      expect(listExtensionsByKind).toHaveBeenCalledWith('provider')
    })
  })

  describe('listOrchestrators', () => {
    it('returns orchestrators from listExtensionsByKind', () => {
      vi.mocked(listExtensionsByKind).mockReturnValue([])
      const result = extensionHandlers.listOrchestrators(undefined)
      expect(result).toEqual({ success: true, data: [] })
      expect(listExtensionsByKind).toHaveBeenCalledWith('orchestrator')
    })
  })

  describe('listUikitExtensions', () => {
    it('returns uikit extensions', () => {
      const ext = makeExt({ manifest: { id: 'x', name: 'X', version: '1.0.0', type: 'uikit' } })
      vi.mocked(listUikitExtensions).mockReturnValue([ext])
      const result = extensionHandlers.listUikitExtensions(undefined)
      expect(result).toEqual({ success: true, data: [ext] })
    })
  })

  describe('getExtensionSummary', () => {
    it('counts tools, themes, uikit, iconpacks', () => {
      vi.mocked(listExtensionsByKind).mockReturnValue([makeExt(), makeExt()])
      loadedExtensions.push(
        makeExt({ manifest: { id: 'a', name: 'A', version: '1.0.0', type: 'theme' } }),
        makeExt({ manifest: { id: 'b', name: 'B', version: '1.0.0', type: 'uikit' } }),
        makeExt({
          manifest: { id: 'c', name: 'C', version: '1.0.0', type: 'iconpack' },
          disabled: true,
        } as any)
      )
      const result = extensionHandlers.getExtensionSummary(undefined)
      expect(result).toEqual({
        success: true,
        data: { tools: 2, themes: 1, uikit: 1, iconpacks: 0 },
      })
    })
  })

  describe('listInstalledExtensions', () => {
    it('returns all loaded extensions with display name applied', () => {
      const ext = makeExt()
      loadedExtensions.push(ext)
      const result = extensionHandlers.listInstalledExtensions(undefined)
      expect((result as any).success).toBe(true)
      expect((result as any).data).toEqual([{ ...ext, manifest: { ...ext.manifest, name: 'Ext' } }])
    })

    it('returns empty array when nothing is loaded', () => {
      const result = extensionHandlers.listInstalledExtensions(undefined)
      expect(result).toEqual({ success: true, data: [] })
    })
  })

  describe('getPreloads', () => {
    it('returns preload urls for enabled extensions with preload entry', () => {
      const ext = makeExt({
        manifest: {
          id: 'com.example.ext',
          name: 'Ext',
          version: '1.0.0',
          type: 'tool',
          entry: { preload: 'preload.ts' },
        },
      })
      loadedExtensions.push(ext)
      const result = extensionHandlers.getPreloads(undefined)
      expect(result).toEqual({
        success: true,
        data: [{ id: 'com.example.ext', url: 'nuxy-ext://com.example.ext/preload.js' }],
      })
    })

    it('excludes disabled extensions and extensions without preload', () => {
      loadedExtensions.push(
        makeExt({
          disabled: true,
          manifest: {
            id: 'd',
            name: 'D',
            version: '1.0.0',
            type: 'tool',
            entry: { preload: 'p.ts' },
          },
        } as any),
        makeExt({ manifest: { id: 'e', name: 'E', version: '1.0.0', type: 'tool' } })
      )
      const result = extensionHandlers.getPreloads(undefined)
      expect(result).toEqual({ success: true, data: [] })
    })
  })

  describe('uninstallExtension', () => {
    it('rejects missing extId', () => {
      const result = extensionHandlers.uninstallExtension(undefined)
      expect(result).toEqual({
        success: false,
        error: 'Missing extension ID',
        code: 'INVALID_ARGS',
      })
    })

    it('rejects malformed payload (non-string extId)', () => {
      const result = extensionHandlers.uninstallExtension({ extId: 42 })
      expect((result as any).code).toBe('INVALID_ARGS')
    })

    it('delegates to kernelUninstallExtension on valid payload', () => {
      vi.mocked(kernelUninstallExtension).mockReturnValue({ success: true })
      const result = extensionHandlers.uninstallExtension({ extId: 'com.example.ext' })
      expect(kernelUninstallExtension).toHaveBeenCalledWith('com.example.ext')
      expect(result).toEqual({ success: true })
    })
  })

  describe('setExtensionEnabled', () => {
    it('rejects missing extId or enabled', () => {
      const result = extensionHandlers.setExtensionEnabled({ extId: 'x' })
      expect((result as any).code).toBe('INVALID_ARGS')
    })

    it('rejects malformed payload', () => {
      const result = extensionHandlers.setExtensionEnabled({ extId: 1, enabled: 'yes' })
      expect((result as any).code).toBe('INVALID_ARGS')
    })

    it('forbids disabling system extensions', () => {
      const result = extensionHandlers.setExtensionEnabled({
        extId: 'com.nuxy.shell',
        enabled: false,
      })
      expect(result).toEqual({
        success: false,
        error: 'Cannot disable system extension',
        code: 'FORBIDDEN',
      })
    })

    it('forbids disabling bootstrap extensions', () => {
      loadedExtensions.push(
        makeExt({
          id: 'com.example.boot',
          manifest: {
            id: 'com.example.boot',
            name: 'Boot',
            version: '1.0.0',
            type: 'tool',
            bootstrap: true,
          },
        })
      )
      const result = extensionHandlers.setExtensionEnabled({
        extId: 'com.example.boot',
        enabled: false,
      })
      expect((result as any).code).toBe('FORBIDDEN')
    })

    it('forbids disabling uikit extensions', () => {
      loadedExtensions.push(
        makeExt({
          id: 'com.example.uikit',
          manifest: { id: 'com.example.uikit', name: 'Uikit', version: '1.0.0', type: 'uikit' },
        })
      )
      const result = extensionHandlers.setExtensionEnabled({
        extId: 'com.example.uikit',
        enabled: false,
      })
      expect((result as any).code).toBe('FORBIDDEN')
    })

    it('enables/disables a normal extension and schedules a rescan', async () => {
      loadedExtensions.push(makeExt())
      const result = extensionHandlers.setExtensionEnabled({
        extId: 'com.example.ext',
        enabled: false,
      })
      expect(result).toEqual({ success: true })
      expect(setExtensionEnabled).toHaveBeenCalledWith('com.example.ext', false)
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(invokeRescan).toHaveBeenCalled()
    })
  })

  describe('installExtension', () => {
    it('rejects missing extId or downloadUrl', () => {
      const result = extensionHandlers.installExtension({ extId: 'x' })
      expect((result as any).code).toBe('INVALID_ARGS')
    })

    it('rejects malformed payload', () => {
      const result = extensionHandlers.installExtension({ extId: 1, downloadUrl: 2 })
      expect((result as any).code).toBe('INVALID_ARGS')
    })

    it('delegates to kernelInstallExtension on valid payload', async () => {
      vi.mocked(kernelInstallExtension).mockResolvedValue({ success: true })
      const result = await extensionHandlers.installExtension({
        extId: 'com.example.ext',
        downloadUrl: 'https://example.com/ext.nuxyext',
      })
      expect(kernelInstallExtension).toHaveBeenCalledWith(
        'com.example.ext',
        'https://example.com/ext.nuxyext'
      )
      expect(result).toEqual({ success: true })
    })
  })
})
