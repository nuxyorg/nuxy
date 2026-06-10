import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.hoisted(() => {
  class HTMLElementStub {
    className = ''
    classList = { add: vi.fn() }
    replaceChildren = vi.fn()
    appendChild = vi.fn()
    children: unknown[] = []
  }
  ;(globalThis as any).window = {
    core: {
      ipc: {
        invoke: vi.fn(async (_ext: string, channel: string) => {
          if (channel === 'getExtensionTranslations') {
            return {
              success: true,
              data: {
                locale: 'en',
                dir: 'ltr',
                translations: { 'search.placeholder': 'Search in notes' },
              },
            }
          }
          return { success: true, data: [] }
        }),
      },
      shell: {
        registerKeyActions: vi.fn(),
        registerActions: vi.fn(),
        refreshKeyHints: vi.fn(),
        controlOmniBar: vi.fn(),
        setSearchPlaceholder: vi.fn(),
      },
      events: { on: vi.fn(() => () => {}) },
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
    html: (strings: any, ..._values: any[]) => strings,
    css: (strings: any, ..._values: any[]) => strings,
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
import notesManifest from '../manifest.json'

describe('notes tool element manifest', () => {
  it('declares nuxy-tool-notes tag', () => {
    expect(resolveToolElementTag(notesManifest as any)).toBe('nuxy-tool-notes')
  })
})

describe('nuxy-tool-notes element', () => {
  beforeEach(async () => {
    vi.resetModules()
    customElements.registry.clear()
    await import('../frontend.ts')
  })

  afterEach(() => {
    customElements.registry.clear()
  })

  it('registers custom element on import', () => {
    expect(customElements.get('nuxy-tool-notes')).toBeDefined()
  })

  it('forwards query property to controller on updates', async () => {
    const Ctor = customElements.get('nuxy-tool-notes')!
    const el = new Ctor() as HTMLElement & {
      query: string
      committedQuery: string
      extensionId: string
    }

    el.connectedCallback()
    el.extensionId = 'com.nuxy.notes'
    el.query = 'todo'
    el.committedQuery = 'todo list'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(el.query).toBe('todo')
    expect(el.committedQuery).toBe('todo list')
    expect(el.extensionId).toBe('com.nuxy.notes')
    expect(window.core.shell.registerKeyActions).toHaveBeenCalled()
    expect(window.core.shell.setSearchPlaceholder).toHaveBeenCalled()
  })

  it('cleans up on disconnect', () => {
    const Ctor = customElements.get('nuxy-tool-notes')!
    const el = new Ctor() as HTMLElement
    el.connectedCallback()
    el.disconnectedCallback()
    expect(window.core.shell.registerActions).toHaveBeenCalledWith([])
  })
})
