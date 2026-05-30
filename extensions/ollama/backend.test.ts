import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { register } from './backend.ts'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'

function createCore({
  storage = {},
  settings = {},
}: { storage?: Record<string, unknown>; settings?: Record<string, unknown> } = {}): {
  core: CoreContext
  handlers: Record<string, (payload: unknown) => unknown>
  storageData: Record<string, unknown>
  settingsData: Record<string, unknown>
} {
  const storageData = { ...storage }
  const settingsData = { ...settings }

  const { core, handlers } = createMockCore(vi, {
    storage: {
      read: vi.fn(async (key: string) => storageData[key] ?? null),
      write: vi.fn(async (key: string, value: unknown) => {
        storageData[key] = value
      }),
    },
    settings: {
      read: vi.fn(async (key: string) => settingsData[key] ?? null),
      write: vi.fn(async (key: string, value: unknown) => {
        settingsData[key] = value
      }),
    },
  })

  return { core, handlers, storageData, settingsData }
}

function makeFetchOk(
  body: unknown
): Promise<{ ok: boolean; json: () => Promise<unknown>; text: () => Promise<string> }> {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(''),
  })
}

function makeFetchError(
  status: number,
  text: string
): Promise<{
  ok: boolean
  status: number
  json: () => Promise<unknown>
  text: () => Promise<string>
}> {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(text),
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ollama backend', () => {
  it('registers as a tool', async () => {
    const { core } = createCore()
    await register(core)
    expect(core.registry.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ollama' })
    )
  })

  describe('chat handler', () => {
    beforeEach(() => {
      vi.spyOn(global, 'fetch').mockReturnValue(
        makeFetchOk({ message: { role: 'assistant', content: 'Hello!' } }) as ReturnType<
          typeof fetch
        >
      )
    })

    it('sends POST /api/chat with correct body', async () => {
      const { core, handlers } = createCore()
      await register(core)
      const messages = [{ role: 'user', content: 'Hi' }]
      await (handlers['chat'] as (p: unknown) => Promise<unknown>)({ messages })
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"stream":false'),
        })
      )
      const body = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
      ) as { messages: unknown[]; stream: boolean; model: unknown }
      expect(body.messages).toEqual(messages)
      expect(body.stream).toBe(false)
      expect(typeof body.model).toBe('string')
    })

    it('returns { content } from the response message', async () => {
      const { core, handlers } = createCore()
      await register(core)
      const result = await (handlers['chat'] as (p: unknown) => Promise<unknown>)({
        messages: [{ role: 'user', content: 'Hi' }],
      })
      expect(result).toEqual({ content: 'Hello!' })
    })

    it('throws a descriptive error when fetch returns non-ok status', async () => {
      vi.restoreAllMocks()
      vi.spyOn(global, 'fetch').mockReturnValue(
        makeFetchError(503, 'Service Unavailable') as ReturnType<typeof fetch>
      )
      const { core, handlers } = createCore()
      await register(core)
      await expect(
        (handlers['chat'] as (p: unknown) => Promise<unknown>)({
          messages: [{ role: 'user', content: 'Hi' }],
        })
      ).rejects.toThrow(/503/)
    })

    it('uses configured host, not a hardcoded URL', async () => {
      vi.restoreAllMocks()
      vi.spyOn(global, 'fetch').mockReturnValue(
        makeFetchOk({ message: { role: 'assistant', content: 'ok' } }) as ReturnType<typeof fetch>
      )
      const { core, handlers } = createCore({
        settings: { host: 'http://my-custom-host:12345', model: 'llama3' },
      })
      await register(core)
      await (handlers['chat'] as (p: unknown) => Promise<unknown>)({
        messages: [{ role: 'user', content: 'test' }],
      })
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://my-custom-host:12345'),
        expect.any(Object)
      )
    })
  })

  describe('models handler', () => {
    it('returns an array of model name strings', async () => {
      vi.spyOn(global, 'fetch').mockReturnValue(
        makeFetchOk({ models: [{ name: 'llama3' }, { name: 'mistral' }] }) as ReturnType<
          typeof fetch
        >
      )
      const { core, handlers } = createCore()
      await register(core)
      const result = await (handlers['models'] as (p: unknown) => Promise<unknown>)({})
      expect(result).toEqual(['llama3', 'mistral'])
    })

    it('returns empty array when fetch fails (graceful)', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'))
      const { core, handlers } = createCore()
      await register(core)
      const result = await (handlers['models'] as (p: unknown) => Promise<unknown>)({})
      expect(result).toEqual([])
    })
  })

  describe('health handler', () => {
    it('returns { ok: true } when fetch succeeds', async () => {
      vi.spyOn(global, 'fetch').mockReturnValue(
        makeFetchOk({ models: [] }) as ReturnType<typeof fetch>
      )
      const { core, handlers } = createCore()
      await register(core)
      const result = await (handlers['health'] as (p: unknown) => Promise<unknown>)({})
      expect(result).toEqual({ ok: true })
    })

    it('returns { ok: false } when fetch throws (never throws itself)', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('connection refused'))
      const { core, handlers } = createCore()
      await register(core)
      const result = await (handlers['health'] as (p: unknown) => Promise<unknown>)({})
      expect(result).toEqual({ ok: false })
    })
  })

  describe('configure handler', () => {
    it('writes model and host to settings', async () => {
      const { core, handlers } = createCore()
      await register(core)
      await (handlers['configure'] as (p: unknown) => Promise<void>)({
        model: 'mistral',
        host: 'http://example.com:11434',
      })
      expect(core.settings.write).toHaveBeenCalledWith('model', 'mistral')
      expect(core.settings.write).toHaveBeenCalledWith('host', 'http://example.com:11434')
    })
  })

  describe('getConfig handler', () => {
    it('returns host and model loaded from saved settings', async () => {
      const { core, handlers } = createCore({
        settings: { host: 'http://remote:11434', model: 'mistral' },
      })
      await register(core)
      const result = await (handlers['getConfig'] as () => Promise<unknown>)()
      expect(result).toEqual({ host: 'http://remote:11434', model: 'mistral' })
    })

    it('returns defaults when no settings exist', async () => {
      const { core, handlers } = createCore()
      await register(core)
      const result = await (handlers['getConfig'] as () => Promise<unknown>)()
      expect(result).toEqual({ host: 'http://localhost:11434', model: 'llama3' })
    })
  })

  describe('query handler', () => {
    it('calls chat with a single user message built from prompt', async () => {
      vi.spyOn(global, 'fetch').mockReturnValue(
        makeFetchOk({ message: { role: 'assistant', content: 'response' } }) as ReturnType<
          typeof fetch
        >
      )
      const { core, handlers } = createCore()
      await register(core)
      const result = await (handlers['query'] as (p: unknown) => Promise<unknown>)({
        prompt: 'tell me a joke',
      })
      const body = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
      ) as { messages: unknown[] }
      expect(body.messages).toEqual([{ role: 'user', content: 'tell me a joke' }])
      expect(result).toEqual({ content: 'response' })
    })
  })

  describe('query handler', () => {
    it('calls chat with the prompt as a user message', async () => {
      vi.spyOn(global, 'fetch').mockReturnValue(
        makeFetchOk({ message: { role: 'assistant', content: 'response' } }) as ReturnType<
          typeof fetch
        >
      )
      const { core, handlers } = createCore()
      await register(core)
      const result = await (handlers['query'] as (p: unknown) => Promise<unknown>)({
        prompt: 'what is the capital of France?',
      })
      const body = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
      ) as { messages: unknown[] }
      expect(body.messages).toEqual([{ role: 'user', content: 'what is the capital of France?' }])
      expect(result).toEqual({ content: 'response' })
    })
  })

  describe('history:save handler', () => {
    it('writes messages to history.json', async () => {
      const { core, handlers } = createCore()
      await register(core)
      const messages = [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi there' },
      ]
      await (handlers['history:save'] as (p: unknown) => Promise<void>)({ messages })
      expect(core.storage.write).toHaveBeenCalledWith('history.json', messages)
    })
  })

  describe('history:load handler', () => {
    it('returns saved messages from storage', async () => {
      const messages = [{ role: 'user', content: 'test' }]
      const { core, handlers } = createCore({ storage: { 'history.json': messages } })
      await register(core)
      const result = await (handlers['history:load'] as () => Promise<unknown>)()
      expect(result).toEqual(messages)
    })

    it('returns empty array when no history exists', async () => {
      const { core, handlers } = createCore()
      await register(core)
      const result = await (handlers['history:load'] as () => Promise<unknown>)()
      expect(result).toEqual([])
    })
  })

  describe('history:clear handler', () => {
    it('writes empty array to history.json', async () => {
      const messages = [{ role: 'user', content: 'old message' }]
      const { core, handlers } = createCore({ storage: { 'history.json': messages } })
      await register(core)
      await (handlers['history:clear'] as () => Promise<void>)()
      expect(core.storage.write).toHaveBeenCalledWith('history.json', [])
    })
  })
})
