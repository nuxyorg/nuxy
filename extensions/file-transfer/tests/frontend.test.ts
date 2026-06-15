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
              translations: {
                'menu.placeholder': 'Choose send or receive',
                'receive.placeholder': 'Enter transfer code',
              },
            },
          }
        }
        if (channel === 'getSettings') {
          return {
            success: true,
            data: {
              downloadDir: '~/Downloads',
              maxFileSizeMb: 512,
              signalingHost: '0.peerjs.com',
              signalingPort: 443,
              stunServer: 'stun:stun.l.google.com:19302',
            },
          }
        }
        return { success: true, data: undefined }
      }),
    },
    shell: {
      registerKeyActions: vi.fn(),
      registerActions: vi.fn(),
      refreshKeyHints: vi.fn(),
      setSearchPlaceholder: vi.fn(),
      controlOmniBar: vi.fn(),
    },
    events: { on: vi.fn(() => () => {}) },
  })
  return h
})

vi.mock('@nuxy/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxy/core')>('@nuxy/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import { resolveToolElementTag } from '@nuxy/core'
import manifest from '../manifest.json'

describe('file-transfer manifest', () => {
  it('declares nuxy-tool-file-transfer tag', () => {
    expect(resolveToolElementTag(manifest as any)).toBe('nuxy-tool-file-transfer')
  })
})

describe('nuxy-tool-file-transfer element', () => {
  beforeEach(async () => {
    vi.resetModules()
    customElements.registry.clear()
    await import('../frontend.ts')
  })

  afterEach(() => {
    customElements.registry.clear()
  })

  it('registers custom element on import', () => {
    expect(customElements.get('nuxy-tool-file-transfer')).toBeDefined()
  })

  it('forwards query and loads settings on connect', async () => {
    const Ctor = customElements.get('nuxy-tool-file-transfer')!
    const el = new Ctor() as HTMLElement & { query: string; connectedCallback: () => void }

    el.connectedCallback()
    el.query = 'FT-ABCD-EFGH'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(window.core.shell!.registerKeyActions).toHaveBeenCalled()
    expect(window.core.shell!.setSearchPlaceholder).toHaveBeenCalled()
  })
})
