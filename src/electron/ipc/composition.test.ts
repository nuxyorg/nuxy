import { describe, it, expect } from 'vitest'
import {
  resolveToolElementTag,
  validateCompositionClaim,
  listCompositionProvides,
} from '@nuxy/core'
import type { ExtensionManifest } from '@nuxy/core'

const shellManifest: ExtensionManifest = {
  id: 'com.nuxy.shell',
  name: 'Shell',
  version: '1.0.0',
  type: 'tool',
  bootstrap: true,
  composition: {
    provides: [
      { name: 'background-layer', maxMounts: 1 },
      { name: 'footer-portal', maxMounts: 1 },
    ],
  },
}

const gradientManifest: ExtensionManifest = {
  id: 'com.nuxy.gradient',
  name: 'Gradient',
  version: '1.0.0',
  type: 'helper',
  composition: {
    claims: ['background-layer'],
  },
}

describe('resolveToolElementTag', () => {
  it('returns entry.element when valid custom element tag', () => {
    const manifest: ExtensionManifest = {
      id: 'com.nuxy.color',
      name: 'Color',
      version: '1.0.0',
      type: 'tool',
      entry: { element: 'nuxy-tool-color' },
    }
    expect(resolveToolElementTag(manifest)).toBe('nuxy-tool-color')
  })

  it('returns null when entry.element is missing', () => {
    const manifest: ExtensionManifest = {
      id: 'com.nuxy.clipboard',
      name: 'Clipboard',
      version: '1.0.0',
      type: 'tool',
      entry: { frontend: 'frontend.js' },
    }
    expect(resolveToolElementTag(manifest)).toBeNull()
  })

  it('returns null for invalid tag names', () => {
    const manifest: ExtensionManifest = {
      id: 'com.nuxy.bad',
      name: 'Bad',
      version: '1.0.0',
      type: 'tool',
      entry: { element: 'NotAValidTag' },
    }
    expect(resolveToolElementTag(manifest)).toBeNull()
  })
})

describe('listCompositionProvides', () => {
  it('returns shell-provided slots', () => {
    expect(listCompositionProvides(shellManifest).map((s) => s.name)).toEqual([
      'background-layer',
      'footer-portal',
    ])
  })

  it('returns empty array when composition is absent', () => {
    const manifest: ExtensionManifest = {
      id: 'com.nuxy.test',
      name: 'Test',
      version: '1.0.0',
      type: 'tool',
    }
    expect(listCompositionProvides(manifest)).toEqual([])
  })
})

describe('validateCompositionClaim', () => {
  it('allows a declared claim against a shell slot', () => {
    const result = validateCompositionClaim(gradientManifest, 'background-layer', shellManifest)
    expect(result).toEqual({ ok: true, maxMounts: 1 })
  })

  it('rejects unknown slot names', () => {
    const result = validateCompositionClaim(gradientManifest, 'unknown-slot', shellManifest)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('SLOT_UNKNOWN')
  })

  it('rejects extensions without a matching claim', () => {
    const intruder: ExtensionManifest = {
      id: 'com.evil.ext',
      name: 'Evil',
      version: '1.0.0',
      type: 'tool',
    }
    const result = validateCompositionClaim(intruder, 'background-layer', shellManifest)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('CLAIM_DENIED')
  })

  it('rejects empty slot name', () => {
    const result = validateCompositionClaim(gradientManifest, '', shellManifest)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_ARGS')
  })
})
