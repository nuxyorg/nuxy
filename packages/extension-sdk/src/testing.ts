import { vi } from 'vitest'
import type { CoreContext, IpcInvokeContext } from '@nuxyorg/core'

export type MockIpcHandler = (payload?: unknown, context?: IpcInvokeContext) => Promise<unknown>

interface WindowCoreConfig {
  ipc?: {
    invoke?: (...args: any[]) => any
  }
  shell?: Record<string, any>
  events?: Record<string, any>
  [key: string]: any
}

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
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
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

/**
 * Creates a mocked `CoreContext` for use in Vitest tests.
 *
 * @param overrides Optional overrides for specific nested properties.
 */
export function createMockCore(overrides?: any): {
  core: CoreContext
  handlers: Record<string, MockIpcHandler>
  publicChannels: Set<string>
} {
  const handlers: Record<string, MockIpcHandler> = {}
  const publicChannels = new Set<string>()

  const core = {
    registry: {
      registerTool: vi.fn(),
      registerProvider: vi.fn(),
      registerOrchestrator: vi.fn(),
      registerTheme: vi.fn(),
      registerIconPack: vi.fn(),
      getCallableTools: vi.fn().mockReturnValue([]),
    },
    ipc: {
      handle: (ch: string, fn: MockIpcHandler, options?: { expose?: 'public' | 'private' }) => {
        handlers[ch] = fn
        if (options?.expose === 'public') publicChannels.add(ch)
      },
      broadcast: vi.fn(),
    },
    storage: {
      read: vi.fn().mockResolvedValue(null),
      write: vi.fn().mockResolvedValue(undefined),
    },
    clipboard: {
      readText: vi.fn(),
      writeText: vi.fn(),
      readImage: vi.fn(),
      writeImage: vi.fn(),
      writeFiles: vi.fn(),
    },
    fs: {
      fileExists: vi.fn().mockResolvedValue(false),
      readDir: vi.fn(),
      readFile: vi.fn(),
      readFileBinary: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      rename: vi.fn(),
      rm: vi.fn(),
      stat: vi.fn(),
      homedir: vi.fn().mockReturnValue('/home/user'),
      tmpdir: vi.fn().mockReturnValue('/tmp'),
    },
    db: { open: vi.fn() },
    shell: { open: vi.fn(), exec: vi.fn(), spawn: vi.fn() },
    media: { getNowPlaying: vi.fn() },
    extensions: { invoke: vi.fn() },
    logger: {
      silly: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    config: {
      get: vi.fn(),
    },
    settings: {
      read: vi.fn().mockResolvedValue(null),
      write: vi.fn().mockResolvedValue(undefined),
    },
    i18n: {
      locale: 'en',
      dir: 'ltr' as const,
      t: vi.fn((key: string) => key),
    },
  } as any

  if (overrides) {
    for (const key of Object.keys(overrides)) {
      if (
        typeof overrides[key] === 'object' &&
        overrides[key] !== null &&
        !Array.isArray(overrides[key])
      ) {
        core[key] = { ...core[key], ...overrides[key] }
      } else {
        core[key] = overrides[key]
      }
    }
  }

  return { core: core as CoreContext, handlers, publicChannels }
}
