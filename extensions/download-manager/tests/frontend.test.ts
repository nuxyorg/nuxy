import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('@nuxyorg/extension-sdk/testing')
  h.setupDomGlobals({
    ipc: {
      invoke: vi.fn(async (_ext: string, channel: string) => {
        if (channel === 'getExtensionTranslations') {
          return {
            success: true,
            data: { locale: 'en', dir: 'ltr', translations: {} },
          }
        }
        if (channel === 'list') {
          return { success: true, data: [] }
        }
        return { success: true, data: undefined }
      }),
    },
    shell: {
      registerKeyActions: vi.fn(),
      registerActions: vi.fn(),
      refreshKeyHints: vi.fn(),
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

describe('download-manager manifest', () => {
  it('declares nuxy-tool-download-manager tag', () => {
    expect(resolveToolElementTag(manifest as any)).toBe('nuxy-tool-download-manager')
  })

  it('declares a settings caller command for Ctrl+K', () => {
    expect(manifest.caller?.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          deeplink: 'nuxy://settings/extension/com.nuxy.download-manager',
          section: 'settings',
        }),
      ])
    )
  })
})

describe('nuxy-tool-download-manager element', () => {
  beforeEach(async () => {
    vi.resetModules()
    customElements.registry.clear()
    await import('../frontend.ts')
  })

  afterEach(() => {
    customElements.registry.clear()
  })

  it('registers custom element on import', () => {
    expect(customElements.get('nuxy-tool-download-manager')).toBeDefined()
  })

  it('connects and registers key actions', async () => {
    const Ctor = customElements.get('nuxy-tool-download-manager')!
    const el = new Ctor() as HTMLElement & { connectedCallback: () => void }

    el.connectedCallback()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(window.core!.shell!.registerKeyActions).toHaveBeenCalled()
  })

  it('applies an add deeplink via committedQuery', async () => {
    const ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    ipcInvoke.mockImplementation(async (_ext: string, channel: string) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: {} } }
      }
      if (channel === 'add') {
        return {
          success: true,
          data: {
            id: 'd1',
            url: 'https://example.com/file.iso',
            fileName: 'file.iso',
            filePath: '/home/user/Downloads/file.iso',
            status: 'queued',
            bytesDownloaded: 0,
            totalBytes: null,
            speedBps: 0,
            error: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        }
      }
      if (channel === 'list') return { success: true, data: [] }
      return { success: true, data: undefined }
    })

    const Ctor = customElements.get('nuxy-tool-download-manager')!
    const el = new Ctor() as HTMLElement & {
      connectedCallback: () => void
      committedQuery: string
    }

    el.committedQuery = 'add?url=https%3A%2F%2Fexample.com%2Ffile.iso'
    el.connectedCallback()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(ipcInvoke).toHaveBeenCalledWith(
      'com.nuxy.download-manager',
      'add',
      expect.objectContaining({ url: 'https://example.com/file.iso' })
    )
  })
})
