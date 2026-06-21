import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('@nuxyorg/extension-sdk/testing')
  h.setupDomGlobals({
    ipc: {
      invoke: vi.fn(async (_ext: string, channel: string) => {
        if (channel === 'getConfig') {
          return {
            success: true,
            data: { host: 'http://localhost:11434', model: 'llama3', thinkingColor: 'light' },
          }
        }
        if (channel === 'history:load') return { success: true, data: [] }
        if (channel === 'models') return { success: true, data: ['llama3', 'mistral'] }
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

import { OllamaController } from '../controller.ts'

function makeStreamResponse(chunks: string[], ok = true): Response {
  const encoder = new TextEncoder()
  let i = 0
  return {
    ok,
    status: 503,
    text: () => Promise.resolve('error'),
    body: {
      getReader: () => ({
        read: () => {
          if (i >= chunks.length) return Promise.resolve({ done: true, value: undefined })
          const value = encoder.encode(chunks[i] + '\n')
          i += 1
          return Promise.resolve({ done: false, value })
        },
      }),
    },
  } as unknown as Response
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('OllamaController.handleSend', () => {
  let invokeMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    invokeMock = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    invokeMock.mockClear()
  })

  it('streams assistant content into the last message', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          makeStreamResponse([
            JSON.stringify({ message: { content: 'Hel' } }),
            JSON.stringify({ message: { content: 'lo!' } }),
          ])
        )
    )

    const controller = new OllamaController(() => {})
    await controller.handleSend('Hi there')

    expect(controller.state.messages.at(-1)).toEqual({ role: 'assistant', content: 'Hello!' })
    expect(controller.state.loading).toBe(false)
    expect(controller.state.error).toBeNull()
  })

  it('sets an error and drops the empty assistant placeholder on HTTP failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service Unavailable'),
      })
    )

    const controller = new OllamaController(() => {})
    await controller.handleSend('Hi there')

    expect(controller.state.error).toMatch(/503/)
    expect(controller.state.messages.at(-1)?.role).toBe('user')
  })

  it('does nothing for blank input', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const controller = new OllamaController(() => {})
    controller.setQuery('   ')
    await controller.handleSend()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(controller.state.messages).toEqual([])
  })
})

describe('OllamaController.handleQueue', () => {
  it('sends the queued message automatically once loading finishes', async () => {
    let resolveFirst: (r: Response) => void = () => {}
    const firstPromise = new Promise<Response>((resolve) => {
      resolveFirst = resolve
    })
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => firstPromise)
      .mockResolvedValueOnce(makeStreamResponse([JSON.stringify({ message: { content: 'ok' } })]))
    vi.stubGlobal('fetch', fetchMock)

    const controller = new OllamaController(() => {})
    const firstSend = controller.handleSend('first')
    controller.handleQueue('second')

    resolveFirst(makeStreamResponse([JSON.stringify({ message: { content: 'first-reply' } })]))
    await firstSend
    await Promise.resolve()
    await Promise.resolve()

    expect(controller.state.queuedMessage).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('OllamaController.handleClearChat', () => {
  it('clears messages and calls history:clear', async () => {
    const controller = new OllamaController(() => {})
    controller.store.setState({ messages: [{ role: 'user', content: 'hi' }] })

    controller.handleClearChat()

    expect(controller.state.messages).toEqual([])
  })
})
