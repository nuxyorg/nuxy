import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { LoadedExtension } from '@nuxyorg/core'

const loadedExtensionsMock: LoadedExtension[] = vi.hoisted(() => [])

vi.mock('../../extensions/scanner.js', () => ({
  loadedExtensions: loadedExtensionsMock,
}))

import { compositionHandlers } from './composition.js'

const shellExt: LoadedExtension = {
  id: 'com.nuxy.shell',
  folderName: 'shell',
  manifest: {
    id: 'com.nuxy.shell',
    name: 'Shell',
    version: '1.0.0',
    type: 'tool',
    bootstrap: true,
    composition: {
      provides: [
        { name: 'background-layer', maxMounts: 1 },
        { name: 'footer-portal', maxMounts: 2 },
      ],
    },
  },
}

const gradientExt: LoadedExtension = {
  id: 'com.nuxy.gradient',
  folderName: 'gradient',
  manifest: {
    id: 'com.nuxy.gradient',
    name: 'Gradient',
    version: '1.0.0',
    type: 'helper',
    composition: {
      claims: ['background-layer'],
    },
  },
}

const intruderExt: LoadedExtension = {
  id: 'com.evil.ext',
  folderName: 'evil',
  manifest: {
    id: 'com.evil.ext',
    name: 'Evil',
    version: '1.0.0',
    type: 'tool',
  },
}

const toolExt: LoadedExtension = {
  id: 'com.nuxy.color',
  folderName: 'color',
  manifest: {
    id: 'com.nuxy.color',
    name: 'Color',
    version: '1.0.0',
    type: 'tool',
    entry: { element: 'nuxy-tool-color' },
  },
}

describe('compositionHandlers', () => {
  beforeEach(() => {
    loadedExtensionsMock.length = 0
  })

  describe('getToolElementTag', () => {
    it('returns INVALID_ARGS when extId is missing', () => {
      const result = compositionHandlers.getToolElementTag(undefined)
      expect(result).toEqual({ success: false, error: 'Missing extId', code: 'INVALID_ARGS' })
    })

    it('returns INVALID_ARGS when extId is the wrong type', () => {
      const result = compositionHandlers.getToolElementTag({ extId: 123 })
      expect(result).toEqual({ success: false, error: 'Missing extId', code: 'INVALID_ARGS' })
    })

    it('returns EXTENSION_NOT_FOUND for an unknown extId', () => {
      const result = compositionHandlers.getToolElementTag({ extId: 'com.unknown' })
      expect(result).toEqual({
        success: false,
        error: 'Extension not found: com.unknown',
        code: 'EXTENSION_NOT_FOUND',
      })
    })

    it('resolves the element tag for a known extension', () => {
      loadedExtensionsMock.push(toolExt)
      const result = compositionHandlers.getToolElementTag({ extId: 'com.nuxy.color' })
      expect(result).toEqual({ success: true, data: 'nuxy-tool-color' })
    })

    it('returns null data when entry.element is absent', () => {
      loadedExtensionsMock.push(gradientExt)
      const result = compositionHandlers.getToolElementTag({ extId: 'com.nuxy.gradient' })
      expect(result).toEqual({ success: true, data: null })
    })
  })

  describe('listCompositionSlots', () => {
    it('returns an empty array when no bootstrap extension is loaded', () => {
      loadedExtensionsMock.push(intruderExt)
      const result = compositionHandlers.listCompositionSlots(undefined)
      expect(result).toEqual({ success: true, data: [] })
    })

    it("returns the bootstrap shell's provided slots", () => {
      loadedExtensionsMock.push(shellExt, gradientExt)
      const result = compositionHandlers.listCompositionSlots(undefined)
      expect((result as any).success).toBe(true)
      expect((result as any).data.map((s: any) => s.name)).toEqual([
        'background-layer',
        'footer-portal',
      ])
    })
  })

  describe('validateCompositionClaim', () => {
    it('returns INVALID_ARGS when extId is missing', () => {
      const result = compositionHandlers.validateCompositionClaim({ slotName: 'background-layer' })
      expect(result).toEqual({
        success: false,
        error: 'Missing extId or slotName',
        code: 'INVALID_ARGS',
      })
    })

    it('returns INVALID_ARGS when slotName is missing', () => {
      const result = compositionHandlers.validateCompositionClaim({ extId: 'com.nuxy.gradient' })
      expect(result).toEqual({
        success: false,
        error: 'Missing extId or slotName',
        code: 'INVALID_ARGS',
      })
    })

    it('returns EXTENSION_NOT_FOUND for an unknown extId', () => {
      loadedExtensionsMock.push(shellExt)
      const result = compositionHandlers.validateCompositionClaim({
        extId: 'com.unknown',
        slotName: 'background-layer',
      })
      expect(result).toEqual({
        success: false,
        error: 'Extension not found: com.unknown',
        code: 'EXTENSION_NOT_FOUND',
      })
    })

    it('allows a valid claim against a shell-provided slot', () => {
      loadedExtensionsMock.push(shellExt, gradientExt)
      const result = compositionHandlers.validateCompositionClaim({
        extId: 'com.nuxy.gradient',
        slotName: 'background-layer',
      })
      expect(result).toEqual({ success: true, data: { maxMounts: 1 } })
    })

    it('denies a claim from an extension without a matching claims entry', () => {
      loadedExtensionsMock.push(shellExt, intruderExt)
      const result = compositionHandlers.validateCompositionClaim({
        extId: 'com.evil.ext',
        slotName: 'background-layer',
      })
      expect(result).toEqual({
        success: false,
        error: 'Extension com.evil.ext is not allowed to claim slot background-layer',
        code: 'CLAIM_DENIED',
      })
    })

    it('rejects an unknown slot name', () => {
      loadedExtensionsMock.push(shellExt, gradientExt)
      const result = compositionHandlers.validateCompositionClaim({
        extId: 'com.nuxy.gradient',
        slotName: 'nonexistent-slot',
      })
      expect(result).toEqual({
        success: false,
        error: 'Unknown composition slot: nonexistent-slot',
        code: 'SLOT_UNKNOWN',
      })
    })
  })
})
