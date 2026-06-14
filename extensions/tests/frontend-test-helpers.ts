/**
 * Shared DOM stub helpers for extension frontend (LitElement custom element) unit tests.
 *
 * Usage inside vi.hoisted():
 *
 *   const hoisted = vi.hoisted(async () => {
 *     const h = await import('../../tests/frontend-test-helpers.ts')
 *     h.setupDomGlobals({ window: { core: { ... } } })
 *     return h
 *   })
 *
 *   vi.mock('@nuxy/core', async () => {
 *     const actual = await vi.importActual<typeof import('@nuxy/core')>('@nuxy/core')
 *     return (await hoisted).createNuxyCoreMock(actual)
 *   })
 */

import { vi } from 'vitest'

interface WindowCoreConfig {
  ipc?: {
    invoke?: (...args: any[]) => any
  }
  shell?: Record<string, any>
  events?: Record<string, any>
  [key: string]: any
}

/**
 * Sets up the minimal globalThis stubs (HTMLElement, customElements, document, window)
 * needed to unit-test LitElement-based custom element frontends in a Node.js environment.
 *
 * @param windowCore - The `window.core` object to set. Callers provide per-extension
 *   ipc/shell/events mocks; the common `UI: {}` stub is added automatically.
 */
export function setupDomGlobals(windowCore: WindowCoreConfig): void {
  class HTMLElementStub {
    className = ''
    style: Record<string, string> = {}
    classList = { add: vi.fn() }
    replaceChildren = vi.fn()
    appendChild = vi.fn()
    children: unknown[] = []
  }

  ;(globalThis as any).window = {
    core: windowCore,
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
}

/**
 * Returns the standard @nuxy/core mock object for LitElement frontend tests.
 * Pass the result of `vi.importActual('@nuxy/core')` as `actual`.
 */
export function createNuxyCoreMock(actual: Record<string, unknown>): Record<string, unknown> {
  return {
    ...actual,
    LitElement: class LitElementStub extends (globalThis as any).HTMLElement {
      requestUpdate = vi.fn()
      updateComplete = Promise.resolve(true)
      connectedCallback() {}
      disconnectedCallback() {}
    },
    html: (strings: any, ..._values: any[]) => strings,
    css: (strings: any, ..._values: any[]) => strings,
    render: vi.fn(),
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
}
