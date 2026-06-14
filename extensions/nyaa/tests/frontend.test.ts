import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('../../tests/frontend-test-helpers.ts')
  h.setupDomGlobals({
    ipc: {
      invoke: vi.fn(async (_ext: string, channel: string) => {
        if (channel === 'getExtensionTranslations') {
          return {
            success: true,
            data: {
              locale: 'en',
              dir: 'ltr',
              translations: { 'search.placeholder': 'Search through Nyaa' },
            },
          }
        }
        return { success: true, data: [] }
      }),
    },
    shell: {
      registerKeyActions: vi.fn(),
      registerActions: vi.fn(),
      refreshKeyHints: vi.fn(),
      setOmniBarPortal: vi.fn(),
      setSearchPlaceholder: vi.fn(),
    },
    events: { on: vi.fn(() => () => {}) },
  })
  return h
})

// Mock @nuxy/core package
vi.mock('@nuxy/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxy/core')>('@nuxy/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import { resolveToolElementTag, validateCompositionClaim } from '@nuxy/core'
import nyaaManifest from '../manifest.json'

const shellManifest = {
  id: 'com.nuxy.shell',
  name: 'Shell',
  version: '1.0.0',
  type: 'tool' as const,
  bootstrap: true,
  composition: {
    provides: [{ name: 'omnibar-portal', maxMounts: 1 }],
  },
}

describe('nyaa tool element manifest', () => {
  it('declares nuxy-tool-nyaa tag', () => {
    expect(resolveToolElementTag(nyaaManifest as any)).toBe('nuxy-tool-nyaa')
  })

  it('claims omnibar-portal composition slot', () => {
    const result = validateCompositionClaim(nyaaManifest as any, 'omnibar-portal', shellManifest)
    expect(result).toEqual({ ok: true, maxMounts: 1 })
  })

  it('declares returnToShellAndHide on primary action complete', () => {
    expect(nyaaManifest.behavior?.onComplete).toBe('returnToShellAndHide')
  })
})

describe('nuxy-tool-nyaa element', () => {
  beforeEach(async () => {
    vi.resetModules()
    customElements.registry.clear()
    await import('../frontend.ts')
  })

  afterEach(() => {
    customElements.registry.clear()
  })

  it('registers custom element on import', () => {
    expect(customElements.get('nuxy-tool-nyaa')).toBeDefined()
  })

  it('forwards query property to controller on updates', async () => {
    const Ctor = customElements.get('nuxy-tool-nyaa')!
    const el = new Ctor() as any

    el.connectedCallback()
    el.extensionId = 'com.nuxy.nyaa'
    el.query = 'ubuntu'
    el.committedQuery = 'ubuntu iso'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(el.query).toBe('ubuntu')
    expect(el.committedQuery).toBe('ubuntu iso')
    expect(window.core.shell!.registerKeyActions).toHaveBeenCalled()
    expect(window.core.shell!.setSearchPlaceholder).toHaveBeenCalled()
  })

  it('cleans up on disconnect', () => {
    const Ctor = customElements.get('nuxy-tool-nyaa')!
    const el = new Ctor() as any
    el.connectedCallback()
    el.disconnectedCallback()
    expect(window.core.shell!.registerActions).toHaveBeenCalledWith([])
  })
})
