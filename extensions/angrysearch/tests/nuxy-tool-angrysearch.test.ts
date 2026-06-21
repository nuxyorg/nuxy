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
              translations: { 'search.placeholder': 'Search files and folders' },
            },
          }
        }
        if (channel === 'getStatus') {
          return { success: true, data: { isUpdating: false, lastUpdate: null, exists: false } }
        }
        return { success: true, data: undefined }
      }),
    },
    shell: {
      registerShellActions: vi.fn(),
      refreshShellActions: vi.fn(),
      setSearchPlaceholder: vi.fn(),
    },
    window: { hide: vi.fn() },
    events: { on: vi.fn(() => () => {}) },
  })
  return h
})

vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxyorg/core')>('@nuxyorg/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import { resolveToolElementTag } from '@nuxyorg/core'
import angrysearchManifest from '../manifest.json'

describe('angrysearch tool element manifest', () => {
  it('declares nuxy-tool-angrysearch tag', () => {
    expect(resolveToolElementTag(angrysearchManifest as any)).toBe('nuxy-tool-angrysearch')
  })
})

describe('nuxy-tool-angrysearch element', () => {
  beforeEach(async () => {
    vi.resetModules()
    customElements.registry.clear()
    await import('../frontend.ts')
  })

  afterEach(() => {
    customElements.registry.clear()
  })

  it('registers custom element on import', () => {
    expect(customElements.get('nuxy-tool-angrysearch')).toBeDefined()
  })

  it('forwards query property to controller on updates', async () => {
    const Ctor = customElements.get('nuxy-tool-angrysearch')!
    const el = new Ctor() as any

    el.connectedCallback()
    el.extensionId = 'com.nuxy.angrysearch'
    el.query = 'todo'
    el.committedQuery = 'todo list'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(el.query).toBe('todo')
    expect(el.committedQuery).toBe('todo list')
    expect(el.extensionId).toBe('com.nuxy.angrysearch')
    expect(window.core.shell!.registerShellActions).toHaveBeenCalled()
    expect(window.core.shell!.setSearchPlaceholder).toHaveBeenCalled()
  })

  it('cleans up on disconnect', () => {
    const Ctor = customElements.get('nuxy-tool-angrysearch')!
    const el = new Ctor() as any
    el.connectedCallback()
    el.disconnectedCallback()
    expect(window.core.shell!.registerShellActions).toHaveBeenCalledWith(null)
  })
})
