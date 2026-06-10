import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.hoisted(() => {
  class HTMLElementStub {
    className = ''
    style: Record<string, string> = {}
    classList = { add: vi.fn() }
    replaceChildren = vi.fn()
    appendChild = vi.fn()
    children: unknown[] = []
  }
  ;(globalThis as any).window = {
    core: {
      ipc: { invoke: vi.fn().mockResolvedValue({ success: true, data: {} }) },
      themes: { list: vi.fn().mockResolvedValue({ success: true, data: [] }) },
      icons: { listPacks: vi.fn().mockResolvedValue({ success: true, data: [] }) },
      shell: { registerKeyActions: vi.fn(), refreshKeyHints: vi.fn() },
      events: { on: vi.fn(() => () => {}), emit: vi.fn() },
    },
    UI: {},
  }
  ;(globalThis as any).HTMLElement = HTMLElementStub
  ;(globalThis as any).customElements = {
    registry: new Map<string, CustomElementConstructor>(),
    get(name: string) {
      return this.registry.get(name)
    },
    define(name: string, ctor: CustomElementConstructor) {
      this.registry.set(name, ctor)
    },
  }
  ;(globalThis as any).document = {
    createTreeWalker: vi.fn(() => ({ nextNode: vi.fn() })),
    createTextNode(text: string) {
      return { nodeType: 3, textContent: text }
    },
    createElement(tag: string) {
      const el: Record<string, unknown> = {
        tagName: tag.toUpperCase(),
        className: '',
        classList: { add: vi.fn() },
        children: [] as unknown[],
        style: {},
        appendChild(node: unknown) {
          ;(el.children as unknown[]).push(node)
        },
        append(...nodes: unknown[]) {
          ;(el.children as unknown[]).push(...nodes)
        },
        replaceChildren(...nodes: unknown[]) {
          el.children = nodes
        },
        setAttribute: vi.fn(),
        addEventListener: vi.fn(),
        querySelector: vi.fn(() => null),
      }
      return el
    },
    createDocumentFragment() {
      return { appendChild: vi.fn(), childNodes: [] }
    },
  }
})

// Mock @nuxy/core package
vi.mock('@nuxy/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxy/core')>('@nuxy/core')
  return {
    ...actual,
    LitElement: class LitElementStub extends globalThis.HTMLElement {
      requestUpdate = vi.fn()
      updateComplete = Promise.resolve(true)
      connectedCallback() {}
      disconnectedCallback() {}
    },
    html: (strings: any, ...values: any[]) => strings,
    css: (strings: any, ...values: any[]) => strings,
    nothing: null,
    customElement: (tag: string) => (ctor: any) => {
      customElements.define(tag, ctor)
      return ctor
    },
    property: () => () => {},
    state: () => () => {},
    query: () => () => {},
    ref: (cb: any) => cb,
    createRef: () => ({ current: null }),
  }
})

import { resolveToolElementTag } from '@nuxy/core'
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

  it('renders native CE on connect', () => {
    const Ctor = customElements.get('nuxy-tool-settings')!
    const el = new Ctor() as any

    el.connectedCallback()
    el.extensionId = 'com.nuxy.settings'
    el.query = 'theme'
    el.committedQuery = 'theme dark'

    expect(el.extensionId).toBe('com.nuxy.settings')
    expect(window.core.shell?.registerKeyActions).toHaveBeenCalled()
  })

  it('cleans up on disconnect', () => {
    const Ctor = customElements.get('nuxy-tool-settings')!
    const el = new Ctor() as any
    el.connectedCallback()
    el.disconnectedCallback()
    expect(window.core.shell?.registerKeyActions).toHaveBeenCalledWith(null)
  })
})
