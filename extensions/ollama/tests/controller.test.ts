/* cspell:ignore ollama */
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

import { flattenTranslations } from '@nuxyorg/core'
import { OllamaController } from '../controller.ts'
import enLocale from '../locales/en.json'

const enTranslations = flattenTranslations(enLocale)

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

  it('refreshes the model list and surfaces an actionable error on a 404 (model not found)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('model "ghost" not found'),
      })
    )
    invokeMock.mockImplementation(async (_ext: string, channel: string) => {
      if (channel === 'getConfig') {
        return {
          success: true,
          data: { host: 'http://localhost:11434', model: 'ghost', thinkingColor: 'light' },
        }
      }
      if (channel === 'models') return { success: true, data: ['llama3', 'mistral'] }
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      return { success: true, data: undefined }
    })

    const controller = new OllamaController(() => {})
    controller.store.setState({ selectedModel: 'ghost' })
    await Promise.resolve()
    await Promise.resolve()
    await controller.handleSend('Hi there')
    await Promise.resolve()
    await Promise.resolve()

    expect(controller.state.error).toBeTruthy()
    expect(controller.state.error).not.toMatch(/Ollama HTTP 404/)
    expect(controller.state.models).toEqual(['llama3', 'mistral'])
    expect(controller.state.selectedModel).toBe('llama3')
  })
})

describe('OllamaController.refreshModels', () => {
  let invokeMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    invokeMock = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    invokeMock.mockClear()
  })

  it('replaces the model list and keeps the current selection if it still exists', async () => {
    invokeMock.mockImplementation(async (_ext: string, channel: string) => {
      if (channel === 'models') return { success: true, data: ['llama3', 'mistral', 'gemma'] }
      return { success: true, data: undefined }
    })

    const controller = new OllamaController(() => {})
    controller.store.setState({ selectedModel: 'mistral' })
    await controller.refreshModels()

    expect(controller.state.models).toEqual(['llama3', 'mistral', 'gemma'])
    expect(controller.state.selectedModel).toBe('mistral')
  })

  it('falls back to the first model when the current selection no longer exists', async () => {
    invokeMock.mockImplementation(async (_ext: string, channel: string) => {
      if (channel === 'models') return { success: true, data: ['llama3', 'gemma'] }
      return { success: true, data: undefined }
    })

    const controller = new OllamaController(() => {})
    controller.store.setState({ selectedModel: 'mistral' })
    await controller.refreshModels()

    expect(controller.state.selectedModel).toBe('llama3')
  })

  it('does not throw when the models call fails', async () => {
    invokeMock.mockImplementation(async () => {
      throw new Error('network down')
    })

    const controller = new OllamaController(() => {})
    await expect(controller.refreshModels()).resolves.toBeUndefined()
    expect(controller.state.models).toEqual([])
  })
})

describe('OllamaController.handleRetry', () => {
  it('drops the trailing assistant message and re-streams without duplicating the user turn', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(makeStreamResponse([JSON.stringify({ message: { content: 'redo' } })]))
    vi.stubGlobal('fetch', fetchMock)

    const controller = new OllamaController(() => {})
    controller.store.setState({
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'old answer' },
      ],
    })

    await controller.handleRetry()

    expect(controller.state.messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'redo' },
    ])
    const [, body] = fetchMock.mock.calls[0] as [string, { body: string }]
    expect(JSON.parse(body.body).messages).toEqual([{ role: 'user', content: 'hi' }])
  })

  it('does nothing when there is no prior user message', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const controller = new OllamaController(() => {})
    await controller.handleRetry()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does nothing while already loading', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const controller = new OllamaController(() => {})
    controller.store.setState({
      loading: true,
      messages: [{ role: 'user', content: 'hi' }],
    })

    await controller.handleRetry()

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('OllamaController.handleCopyLastMessage', () => {
  it('copies the last message content to the clipboard', () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    const controller = new OllamaController(() => {})
    controller.store.setState({
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello there' },
      ],
    })

    controller.handleCopyLastMessage()

    expect(writeText).toHaveBeenCalledWith('hello there')
  })

  it('does nothing when there are no messages', () => {
    const writeText = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    const controller = new OllamaController(() => {})
    controller.handleCopyLastMessage()

    expect(writeText).not.toHaveBeenCalled()
  })
})

describe('OllamaController Ctrl+K actions', () => {
  let getter: (() => ReturnType<OllamaController['getKeyActions']>) | null = null

  beforeEach(() => {
    getter = null
    vi.mocked(window.core!.shell!.registerShellActions).mockImplementation((fn) => {
      getter = fn as typeof getter
    })
  })

  it('exposes copy-last-message and retry as Ctrl+K menu entries', () => {
    const controller = new OllamaController(() => {})
    controller.connect()
    controller.store.setState({
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
      ],
    })

    const actions = getter!()
    const copy = actions.find((a) => a.id === 'ollama-copy-last-message')
    const retry = actions.find((a) => a.id === 'ollama-retry')

    expect(copy?.key).toBe('c')
    expect(copy?.modifiers).toEqual(['ctrl'])
    expect(copy?.showInMenu).toBe(true)
    expect(copy?.activeOn?.()).toBe(true)

    expect(retry?.key).toBe('r')
    expect(retry?.modifiers).toEqual(['ctrl'])
    expect(retry?.showInMenu).toBe(true)
    expect(retry?.activeOn?.()).toBe(true)

    controller.disconnect()
  })

  it('retry is inactive while loading or with no prior user turn', () => {
    const controller = new OllamaController(() => {})
    controller.connect()

    let retry = getter!().find((a) => a.id === 'ollama-retry')
    expect(retry?.activeOn?.()).toBe(false)

    controller.store.setState({ messages: [{ role: 'user', content: 'hi' }], loading: true })
    retry = getter!().find((a) => a.id === 'ollama-retry')
    expect(retry?.activeOn?.()).toBe(false)

    controller.disconnect()
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
