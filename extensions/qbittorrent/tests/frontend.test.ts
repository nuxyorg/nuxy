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
              translations: {
                'search.placeholder': 'Search torrents',
                'empty.message': 'No torrents',
                'empty.hint': 'Add one',
                'empty.noMatching': 'No matches',
                'add.prompt': 'Add torrent',
                'add.hint': 'Press Enter',
                'add.adding': 'Adding…',
                'state.downloading': 'Downloading',
                'item.copiedMagnet': 'Copied',
              },
            },
          }
        }
        if (channel === 'list') {
          return { success: true, data: [] }
        }
        return { success: true, data: undefined }
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
import manifest from '../manifest.json'

describe('qbittorrent manifest', () => {
  it('declares nuxy-tool-qbittorrent tag', () => {
    expect(resolveToolElementTag(manifest as Parameters<typeof resolveToolElementTag>[0])).toBe(
      'nuxy-tool-qbittorrent'
    )
  })

  it('declares settings so the shell auto-synthesizes a Ctrl+. entry', () => {
    expect(manifest.entry?.settings).toBe('settings.json')
  })
})

describe('nuxy-tool-qbittorrent element', () => {
  beforeEach(async () => {
    vi.resetModules()
    customElements.registry.clear()
    await import('../frontend.ts')
  })

  afterEach(() => {
    customElements.registry.clear()
  })

  it('registers custom element on import', () => {
    expect(customElements.get('nuxy-tool-qbittorrent')).toBeDefined()
  })

  it('forwards query property to controller and syncs search placeholder on connect', async () => {
    const Ctor = customElements.get('nuxy-tool-qbittorrent')!
    const el = new Ctor() as HTMLElement & {
      connectedCallback: () => void
      disconnectedCallback: () => void
      query: string
      extensionId: string
    }

    el.connectedCallback()
    el.extensionId = 'com.nuxy.qbittorrent'
    el.query = 'ubuntu'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(el.query).toBe('ubuntu')
    expect(window.core!.shell!.registerShellActions).toHaveBeenCalled()
    expect(window.core!.shell!.setSearchPlaceholder).toHaveBeenCalled()
    el.disconnectedCallback()
    expect(window.core!.shell!.registerShellActions).toHaveBeenCalledWith(null)
  })

  it('applies an add deeplink via committedQuery', async () => {
    const ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    const addedUrls: string[] = []
    ipcInvoke.mockImplementation(async (_ext: string, channel: string, payload?: unknown) => {
      if (channel === 'getExtensionTranslations') {
        return {
          success: true,
          data: { locale: 'en', dir: 'ltr', translations: {} },
        }
      }
      if (channel === 'add') {
        addedUrls.push((payload as { url: string }).url)
        return { success: true, data: undefined }
      }
      if (channel === 'list') {
        return { success: true, data: [] }
      }
      return { success: true, data: undefined }
    })

    const Ctor = customElements.get('nuxy-tool-qbittorrent')!
    const el = new Ctor() as HTMLElement & {
      connectedCallback: () => void
      disconnectedCallback: () => void
      committedQuery: string
    }

    el.committedQuery = 'add?url=magnet%3A%3Fxt%3Durn%3Abtih%3Adef456'
    el.connectedCallback()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(addedUrls).toEqual(['magnet:?xt=urn:btih:def456'])
    el.disconnectedCallback()
  })

  it('enters add mode when query is set to a .torrent URL before connect', async () => {
    const Ctor = customElements.get('nuxy-tool-qbittorrent')!
    const el = new Ctor() as HTMLElement & {
      connectedCallback: () => void
      disconnectedCallback: () => void
      query: string
    }

    el.query = 'https://example.com/file.torrent'
    el.connectedCallback()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(window.core!.shell!.refreshShellActions).toHaveBeenCalled()
    el.disconnectedCallback()
  })

  it('ignores duplicate query assignments', async () => {
    const Ctor = customElements.get('nuxy-tool-qbittorrent')!
    const el = new Ctor() as HTMLElement & {
      connectedCallback: () => void
      disconnectedCallback: () => void
      query: string
    }

    el.connectedCallback()
    el.query = 'ubuntu'
    await new Promise((resolve) => setTimeout(resolve, 0))

    const callsBefore = vi.mocked(window.core!.shell!.refreshShellActions).mock.calls.length
    el.query = 'ubuntu'
    expect(vi.mocked(window.core!.shell!.refreshShellActions).mock.calls.length).toBe(callsBefore)
    el.disconnectedCallback()
  })
})
