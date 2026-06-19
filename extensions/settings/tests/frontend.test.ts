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
              translations: { 'search.placeholder': 'Search in settings' },
            },
          }
        }
        return { success: true, data: {} }
      }),
    },
    themes: { list: vi.fn().mockResolvedValue({ success: true, data: [] }) },
    icons: { listPacks: vi.fn().mockResolvedValue({ success: true, data: [] }) },
    shell: {
      registerKeyActions: vi.fn(),
      refreshKeyHints: vi.fn(),
      setSearchPlaceholder: vi.fn(),
    },
    events: { on: vi.fn(() => () => {}), emit: vi.fn() },
  })
  return h
})

// Mock @nuxyorg/core package
vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxyorg/core')>('@nuxyorg/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import { resolveToolElementTag } from '@nuxyorg/core'
import settingsManifest from '../manifest.json'

describe('settings tool element manifest', () => {
  it('declares nuxy-tool-settings tag', () => {
    expect(resolveToolElementTag(settingsManifest as any)).toBe('nuxy-tool-settings')
  })
})

describe('nuxy-tool-settings element', () => {
  beforeEach(async () => {
    vi.resetModules()
    customElements.registry.clear()
    await import('../frontend.ts')
  })

  afterEach(() => {
    customElements.registry.clear()
  })

  it('registers custom element on import', () => {
    expect(customElements.get('nuxy-tool-settings')).toBeDefined()
  })

  it('renders native CE on connect', async () => {
    const Ctor = customElements.get('nuxy-tool-settings')!
    const el = new Ctor() as any

    el.connectedCallback()
    el.extensionId = 'com.nuxy.settings'
    el.query = 'theme'
    el.committedQuery = 'theme dark'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(el.extensionId).toBe('com.nuxy.settings')
    expect(window.core.shell?.registerKeyActions).toHaveBeenCalled()
    expect(window.core.shell?.setSearchPlaceholder).toHaveBeenCalled()
  })

  it('retries selectPanelFromDeeplinkPath on later updates until it succeeds', async () => {
    // The target extension's settings section may not exist on the first
    // attempt (its schema loads asynchronously) — the element must keep
    // retrying on subsequent re-renders rather than applying it only once.
    const { SettingsController } = await import('../controller.ts')
    const spy = vi
      .spyOn(SettingsController.prototype, 'selectPanelFromDeeplinkPath')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)

    const Ctor = customElements.get('nuxy-tool-settings')!
    const el = new Ctor() as any
    el.committedQuery = 'extension/com.nuxy.nyaa'
    el.connectedCallback()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(spy).toHaveBeenCalledTimes(1)

    // Simulate a subsequent re-render triggered by the controller's onUpdate
    // callback (e.g. extSchemas finishing its async load).
    el.updated(new Map())

    expect(spy).toHaveBeenCalledTimes(2)

    // Once applied, further re-renders must not call it again.
    el.updated(new Map())
    expect(spy).toHaveBeenCalledTimes(2)

    spy.mockRestore()
  })

  it('cleans up on disconnect', () => {
    const Ctor = customElements.get('nuxy-tool-settings')!
    const el = new Ctor() as any
    el.connectedCallback()
    el.disconnectedCallback()
    expect(window.core.shell?.registerKeyActions).toHaveBeenCalledWith(null)
  })
})
