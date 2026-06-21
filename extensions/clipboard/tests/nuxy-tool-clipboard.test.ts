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
              translations: { 'search.placeholder': 'Search clipboard history' },
            },
          }
        }
        return { success: true, data: [] }
      }),
    },
    shell: {
      registerShellActions: vi.fn(),
      refreshShellActions: vi.fn(),
      controlOmniBar: vi.fn(),
      setSearchPlaceholder: vi.fn(),
    },
    events: { on: vi.fn(() => () => {}) },
  })
  return h
})

vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxyorg/core')>('@nuxyorg/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import { resolveToolElementTag } from '@nuxyorg/core'
import clipboardManifest from '../manifest.json'

describe('clipboard tool element manifest', () => {
  it('declares nuxy-tool-clipboard tag', () => {
    expect(resolveToolElementTag(clipboardManifest as any)).toBe('nuxy-tool-clipboard')
  })
})

describe('nuxy-tool-clipboard element', () => {
  beforeEach(async () => {
    vi.resetModules()
    customElements.registry.clear()
    await import('../frontend.ts')
  })

  afterEach(() => {
    customElements.registry.clear()
  })

  it('registers custom element on import', () => {
    expect(customElements.get('nuxy-tool-clipboard')).toBeDefined()
  })

  it('forwards query property to controller on updates', async () => {
    const Ctor = customElements.get('nuxy-tool-clipboard')!
    const el = new Ctor() as any

    el.connectedCallback()
    el.extensionId = 'com.nuxy.clipboard'
    el.query = 'banana'
    el.committedQuery = 'banana split'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(el.query).toBe('banana')
    expect(el.committedQuery).toBe('banana split')
    expect(window.core.shell!.registerShellActions).toHaveBeenCalled()
    expect(window.core.shell!.setSearchPlaceholder).toHaveBeenCalled()
  })

  it('cleans up on disconnect', () => {
    const Ctor = customElements.get('nuxy-tool-clipboard')!
    const el = new Ctor() as any
    el.connectedCallback()
    el.disconnectedCallback()
    expect(window.core.shell!.registerShellActions).toHaveBeenCalledWith(null)
  })
})
