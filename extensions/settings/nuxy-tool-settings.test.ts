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
      shell: { registerKeyActions: vi.fn() },
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

import { resolveToolElementTag } from '@nuxy/core'
import settingsManifest from './manifest.json'

describe('settings tool element manifest', () => {
  it('declares nuxy-tool-settings tag', () => {
    expect(resolveToolElementTag(settingsManifest as any)).toBe('nuxy-tool-settings')
  })
})

describe('nuxy-tool-settings element', () => {
  beforeEach(async () => {
    vi.resetModules()
    customElements.registry.clear()
    await import('./nuxy-tool-settings.ts')
  })

  afterEach(() => {
    customElements.registry.clear()
  })

  it('registers custom element on import', () => {
    expect(customElements.get('nuxy-tool-settings')).toBeDefined()
  })

  it('renders native CE on connect', () => {
    const Ctor = customElements.get('nuxy-tool-settings')!
    const el = new Ctor() as HTMLElement & {
      query: string
      committedQuery: string
      extensionId: string
    }

    el.connectedCallback()
    el.extensionId = 'com.nuxy.settings'
    el.query = 'theme'
    el.committedQuery = 'theme dark'

    expect(el.replaceChildren).toHaveBeenCalled()
    expect(el.extensionId).toBe('com.nuxy.settings')
  })

  it('cleans up on disconnect', () => {
    const Ctor = customElements.get('nuxy-tool-settings')!
    const el = new Ctor() as HTMLElement
    el.connectedCallback()
    el.disconnectedCallback()
    expect(el.replaceChildren).toHaveBeenCalled()
    expect(window.core.shell.registerKeyActions).toHaveBeenCalledWith(null)
  })
})
