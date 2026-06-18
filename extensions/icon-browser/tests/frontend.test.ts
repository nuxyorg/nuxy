import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('@nuxyorg/extension-sdk/testing')
  h.setupDomGlobals({
    ipc: { invoke: vi.fn() },
    shell: {
      refreshKeyHints: vi.fn(),
      setFooterPortal: vi.fn(),
    },
  })
  return h
})

vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxyorg/core')>('@nuxyorg/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import { resolveToolElementTag } from '@nuxyorg/core'
import iconBrowserManifest from '../manifest.json'

describe('icon-browser tool element manifest', () => {
  it('declares nuxy-tool-icon-browser tag', () => {
    expect(resolveToolElementTag(iconBrowserManifest as any)).toBe('nuxy-tool-icon-browser')
  })
})

describe('nuxy-tool-icon-browser element', () => {
  beforeEach(async () => {
    vi.resetModules()
    customElements.registry.clear()
    await import('../frontend.ts')
  })

  afterEach(() => {
    customElements.registry.clear()
  })

  it('registers custom element on import', () => {
    expect(customElements.get('nuxy-tool-icon-browser')).toBeDefined()
  })

  it('forwards query updates to the controller', () => {
    const Ctor = customElements.get('nuxy-tool-icon-browser')!
    const el = new Ctor() as any

    el.connectedCallback()
    el.query = 'home'

    expect(el.query).toBe('home')
  })

  it('clicking a grid item activates it and copies its name', async () => {
    const Ctor = customElements.get('nuxy-tool-icon-browser')!
    const el = new Ctor() as any

    el.connectedCallback()
    el.controller.store.setState({ filtered: ['home', 'search'], activeIndex: -1 })

    const copySpy = vi.spyOn(el.controller, 'copyActiveName').mockResolvedValue(undefined)
    el.onItemClick(1)

    expect(el.controller.state.activeIndex).toBe(1)
    expect(copySpy).toHaveBeenCalledOnce()
  })
})
