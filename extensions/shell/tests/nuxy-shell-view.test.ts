import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let capturedOnUpdate: (() => void) | null = null

vi.hoisted(() => {
  class HTMLElementStub {
    className = ''
    style: Record<string, string> = {}
    classList = { add: vi.fn(), remove: vi.fn(), contains: vi.fn(() => false), toggle: vi.fn() }
    replaceChildren = vi.fn()
    appendChild = vi.fn()
    insertBefore = vi.fn((node: unknown) => node)
    prepend = vi.fn()
    querySelector = vi.fn(() => null)
    querySelectorAll = vi.fn(() => [])
    addEventListener = vi.fn()
    removeEventListener = vi.fn()
    setAttribute = vi.fn()
    removeAttribute = vi.fn()
    getAttribute = vi.fn()
    children: unknown[] = []
    isConnected = true
    parentNode = null
    nextSibling = null
    shadowRoot: any = null
    attachShadow = vi.fn(function (this: any) {
      this.shadowRoot = {
        querySelector: vi.fn(() => null),
        querySelectorAll: vi.fn(() => []),
        appendChild: vi.fn(),
      }
      return this.shadowRoot
    })
  }
  ;(globalThis as any).window = {
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    core: {
      ipc: { invoke: vi.fn() },
      window: { esc: vi.fn(), resize: vi.fn(), hide: vi.fn() },
      events: { on: vi.fn(() => () => {}), emit: vi.fn() },
      shell: {
        registerShellActions: vi.fn(),
        refreshShellActions: vi.fn(),
        bindReturnToShell: vi.fn(() => () => {}),
        subscribeOmniBarControl: vi.fn(() => () => {}),
        subscribe: vi.fn(() => () => {}),
        getSnapshot: vi.fn(() => ({
          toolActions: [],
          keyActionHints: [],
          omniBarPortal: null,
          footerPortal: null,
          searchPlaceholder: null,
        })),
        resetToolState: vi.fn(),
      },
    },
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
    createElement(tag: string) {
      const el: Record<string, unknown> = {
        tagName: tag.toUpperCase(),
        className: '',
        style: {},
        classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn(() => false) },
        children: [] as unknown[],
        isConnected: true,
        appendChild(node: unknown) {
          ;(el.children as unknown[]).push(node)
        },
        replaceChildren(...nodes: unknown[]) {
          el.children = nodes
        },
        insertBefore: vi.fn((node: unknown) => node),
        prepend: vi.fn(),
        querySelector: vi.fn(() => null),
        querySelectorAll: vi.fn(() => []),
        setAttribute: vi.fn(),
        removeAttribute: vi.fn(),
        getAttribute: vi.fn(() => null),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }
      return el
    },
    createDocumentFragment() {
      return { appendChild: vi.fn(), childNodes: [] }
    },
    createComment: vi.fn((data: string) => ({ nodeType: 8, data })),
    createTreeWalker: vi.fn(() => ({ nextNode: vi.fn() })),
    createTextNode: vi.fn((t: string) => ({ nodeType: 3, textContent: t })),
    documentElement: { style: {} },
  }
  ;(globalThis as any).MutationObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
  }))
})

vi.mock('lit', () => ({
  LitElement: class LitElementStub extends (globalThis as any).HTMLElement {
    requestUpdate = vi.fn()
    updateComplete = Promise.resolve(true)
    connectedCallback() {}
    disconnectedCallback() {}
  },
  html: (strings: any, ..._values: any[]) => strings,
  css: (strings: any) => strings.join(''),
  nothing: null,
}))

vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxyorg/core')>('@nuxyorg/core')
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
    nothing: null,
    customElement: (tag: string) => (ctor: CustomElementConstructor) => {
      customElements.define(tag, ctor)
      return ctor
    },
    property: () => () => {},
    state: () => () => {},
    query: () => () => {},
    ref: (cb: unknown) => cb,
  }
})

vi.mock('lit/decorators.js', () => ({
  customElement: (tag: string) => (ctor: CustomElementConstructor) => {
    customElements.define(tag, ctor)
    return ctor
  },
  property: () => () => {},
  state: () => () => {},
  query: () => () => {},
}))

vi.mock('lit/directives/ref.js', () => ({ ref: (cb: unknown) => cb }))

vi.mock('../controller.ts', () => ({
  ShellController: class MockShellController {
    refs = { container: null, input: null }
    state = {
      query: '',
      savedQuery: '',
      selectedIndex: -1,
      activeTool: null,
      showOmniBar: true,
      showCommandPalette: false,
      providerStates: {},
      omnibarSections: [],
      navigableResults: [],
      providerCardItems: [],
      isAnyListProviderLoading: false,
      bridge: {
        toolActions: [],
        keyActionHints: [],
        footerPortal: null,
        omniBarPortal: null,
        searchPlaceholder: null,
      },
      themeStyles: null,
      tools: [],
      position: { x: 0, y: 0 },
      size: { width: null, height: null },
      copiedId: null,
    }
    connect = vi.fn()
    disconnect = vi.fn()
    containerStyle = vi.fn(() => ({}))
    t = { t: vi.fn((k: string) => k) }
    constructor(onUpdate: () => void) {
      capturedOnUpdate = onUpdate
    }
  },
}))

vi.mock('../utils.ts', () => ({
  ensureShellStyles: vi.fn(),
  parseCoordinate: vi.fn(),
  SHELL_EXT_ID: 'com.nuxy.shell',
}))

vi.mock('../nuxy-shell.ts', () => ({}))
vi.mock('../nuxy-portal-host.ts', () => ({}))
vi.mock('../nuxy-shell-resize-handles.ts', () => ({}))
vi.mock('../nuxy-shell-omni-bar.ts', () => ({}))
vi.mock('../nuxy-command-palette.ts', () => ({}))

describe('NuxyShellViewElement', () => {
  beforeEach(async () => {
    capturedOnUpdate = null
    vi.resetModules()
    customElements.registry.clear()
    await import('../frontend.ts')
  })

  afterEach(() => {
    customElements.registry.clear()
  })

  function makeEl() {
    const Ctor = customElements.get('nuxy-shell-view')!
    const el = new Ctor() as any
    // Prevent real Lit's async update microtask from firing after tests
    el.__enqueueUpdate = vi.fn()
    el._$enqueueUpdate = vi.fn()
    el.performUpdate = vi.fn()
    return el
  }

  it('registers nuxy-shell-view on import', () => {
    expect(customElements.get('nuxy-shell-view')).toBeDefined()
  })

  it('calls requestUpdate when ShellController fires onUpdate', () => {
    const el = makeEl()
    const spy = vi.fn()
    el.requestUpdate = spy
    el.connectedCallback()
    expect(capturedOnUpdate).not.toBeNull()
    capturedOnUpdate!()
    expect(spy).toHaveBeenCalled()
  })

  it('calls controller.disconnect and nulls controller on disconnectedCallback', () => {
    const el = makeEl()
    el.connectedCallback()
    const ctrl = el.controller
    el.disconnectedCallback()
    expect(ctrl.disconnect).toHaveBeenCalled()
    expect(el.controller).toBeNull()
  })
})
