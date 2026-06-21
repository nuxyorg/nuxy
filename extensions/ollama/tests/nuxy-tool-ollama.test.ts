import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('@nuxyorg/extension-sdk/testing')
  h.setupDomGlobals({
    ipc: {
      invoke: vi.fn(async (_ext: string, channel: string) => {
        if (channel === 'getExtensionTranslations') {
          return {
            success: true,
            data: { locale: 'en', dir: 'ltr', translations: { 'empty.hint': 'Ask anything' } },
          }
        }
        if (channel === 'getConfig') {
          return {
            success: true,
            data: { host: 'http://localhost:11434', model: 'llama3', thinkingColor: 'light' },
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
import ollamaManifest from '../manifest.json'

describe('ollama tool element manifest', () => {
  it('declares nuxy-tool-ollama tag', () => {
    expect(resolveToolElementTag(ollamaManifest as any)).toBe('nuxy-tool-ollama')
  })
})

describe('nuxy-tool-ollama element', () => {
  beforeEach(async () => {
    vi.resetModules()
    customElements.registry.clear()
    await import('../frontend.ts')
  })

  afterEach(() => {
    customElements.registry.clear()
  })

  it('registers custom element on import', () => {
    expect(customElements.get('nuxy-tool-ollama')).toBeDefined()
  })

  it('forwards query property to controller on updates', async () => {
    const Ctor = customElements.get('nuxy-tool-ollama')!
    const el = new Ctor() as any

    el.connectedCallback()
    el.extensionId = 'com.nuxy.ollama'
    el.query = 'explain recursion'
    el.committedQuery = 'explain recursion please'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(el.query).toBe('explain recursion')
    expect(el.committedQuery).toBe('explain recursion please')
    expect(el.extensionId).toBe('com.nuxy.ollama')
    expect(window.core.shell!.registerShellActions).toHaveBeenCalled()
  })

  it('cleans up on disconnect', () => {
    const Ctor = customElements.get('nuxy-tool-ollama')!
    const el = new Ctor() as any
    el.connectedCallback()
    el.disconnectedCallback()
    expect(window.core.shell!.registerShellActions).toHaveBeenCalledWith(null)
  })
})
