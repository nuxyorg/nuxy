import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { register } from './backend.ts'
import type { CoreContext } from '@nuxy/extension-sdk'

function createCore({ storage = {} }: { storage?: Record<string, unknown> } = {}): {
  core: CoreContext
  handlers: Record<string, (payload: unknown) => unknown>
  storageData: Record<string, unknown>
} {
  const handlers: Record<string, (payload: unknown) => unknown> = {}
  const storageData = { ...storage }

  const core = {
    registry: {
      registerTool: vi.fn(),
      registerProvider: vi.fn(),
      registerOrchestrator: vi.fn(),
      registerTheme: vi.fn(),
      registerIconPack: vi.fn(),
    },
    ipc: {
      handle: (ch: string, fn: (payload: unknown) => unknown) => {
        handlers[ch] = fn
      },
    },
    storage: {
      read: vi.fn(async (key: string) => storageData[key] ?? null),
      write: vi.fn(async (key: string, value: unknown) => {
        storageData[key] = value
      }),
    },
    clipboard: {
      readText: vi.fn(),
      writeText: vi.fn(),
      readImage: vi.fn(),
      writeImage: vi.fn(),
      writeFiles: vi.fn(),
    },
    fs: {
      fileExists: vi.fn(),
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
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), silly: vi.fn() },
    config: { get: vi.fn() },
  } as unknown as CoreContext

  return { core, handlers, storageData }
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
  it('registers an orchestrator function', async () => {
    const { core } = createCore()
    await register(core)
    expect(core.registry.registerOrchestrator).toHaveBeenCalledWith(expect.any(Function))
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
        storage: { 'config.json': { host: 'http://my-custom-host:12345', model: 'llama3' } },
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
    it('writes config to storage', async () => {
      const { core, handlers } = createCore()
      await register(core)
      await (handlers['configure'] as (p: unknown) => Promise<void>)({
        model: 'mistral',
        host: 'http://example.com:11434',
      })
      expect(core.storage.write).toHaveBeenCalledWith(
        'config.json',
        expect.objectContaining({ model: 'mistral', host: 'http://example.com:11434' })
      )
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

  describe('orchestrator function', () => {
    it('calls chat with the raw text as a user message', async () => {
      vi.spyOn(global, 'fetch').mockReturnValue(
        makeFetchOk({ message: { role: 'assistant', content: 'response' } }) as ReturnType<
          typeof fetch
        >
      )
      const { core } = createCore()
      await register(core)
      const orchestratorFn = (core.registry.registerOrchestrator as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as (text: string) => Promise<unknown>
      const result = await orchestratorFn('what is the capital of France?')
      const body = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
      ) as { messages: unknown[] }
      expect(body.messages).toEqual([{ role: 'user', content: 'what is the capital of France?' }])
      expect(result).toEqual({ content: 'response' })
    })
  })
})
