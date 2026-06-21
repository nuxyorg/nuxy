import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('@nuxyorg/extension-sdk/testing')
  h.setupDomGlobals({
    ipc: {
      invoke: vi.fn(async (_ext: string, channel: string) => {
        if (channel === 'getExtensionTranslations') {
          return {
            success: true,
            data: {
              locale: 'en',
              dir: 'ltr',
              translations: { 'search.placeholder': 'Search extensions' },
            },
          }
        }
        return { success: true, data: [] }
      }),
    },
    shell: {
      registerShellActions: vi.fn(),
      refreshShellActions: vi.fn(),
      setSearchPlaceholder: vi.fn(),
    },
    events: { on: vi.fn(() => () => {}) },
  })
  return h
})

// Mock @nuxyorg/core package
vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxyorg/core')>('@nuxyorg/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import { resolveToolElementTag } from '@nuxyorg/core'
import storeManifest from '../manifest.json'

describe('store tool element manifest', () => {
  it('declares nuxy-tool-store tag', () => {
    expect(resolveToolElementTag(storeManifest as any)).toBe('nuxy-tool-store')
  })
})

describe('nuxy-tool-store element', () => {
  beforeEach(async () => {
    vi.resetModules()
    customElements.registry.clear()
    await import('../frontend.ts')
  })

  afterEach(() => {
    customElements.registry.clear()
  })

  it('registers custom element on import', () => {
    expect(customElements.get('nuxy-tool-store')).toBeDefined()
  })

  it('forwards query property to controller on updates', async () => {
    const Ctor = customElements.get('nuxy-tool-store')!
    const el = new Ctor() as any

    el.connectedCallback()
    el.extensionId = 'com.nuxy.store'
    el.query = 'nyaa'
    el.committedQuery = 'nyaa search'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(el.query).toBe('nyaa')
    expect(el.committedQuery).toBe('nyaa search')
    expect(el.extensionId).toBe('com.nuxy.store')
    expect(window.core.shell!.registerShellActions).toHaveBeenCalled()
    expect(window.core.shell!.setSearchPlaceholder).toHaveBeenCalled()
  })

  it('cleans up on disconnect', () => {
    const Ctor = customElements.get('nuxy-tool-store')!
    const el = new Ctor() as any
    el.connectedCallback()
    el.disconnectedCallback()
    expect(window.core.shell!.registerShellActions).toHaveBeenCalledWith(null)
  })
})
