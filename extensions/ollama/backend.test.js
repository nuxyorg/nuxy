import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { register } from './backend.js'

function createCore({ storage = {} } = {}) {
  const handlers = {}
  const storageData = { ...storage }

  const core = {
    registry: {
      registerOrchestrator: vi.fn(),
    },
    ipc: {
      handle: (ch, fn) => {
        handlers[ch] = fn
      },
    },
    storage: {
      read: vi.fn(async (key) => storageData[key] ?? null),
      write: vi.fn(async (key, value) => {
        storageData[key] = value
      }),
    },
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  }

  return { core, handlers, storageData }
}

function makeFetchOk(body) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(''),
  })
}

function makeFetchError(status, text) {
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
        makeFetchOk({ message: { role: 'assistant', content: 'Hello!' } })
      )
    })

    it('sends POST /api/chat with correct body', async () => {
      const { core, handlers } = createCore()
      await register(core)
      const messages = [{ role: 'user', content: 'Hi' }]
      await handlers.chat({ messages })
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"stream":false'),
        })
      )
      const body = JSON.parse(global.fetch.mock.calls[0][1].body)
      expect(body.messages).toEqual(messages)
      expect(body.stream).toBe(false)
      expect(typeof body.model).toBe('string')
    })

    it('returns { content } from the response message', async () => {
      const { core, handlers } = createCore()
      await register(core)
      const result = await handlers.chat({ messages: [{ role: 'user', content: 'Hi' }] })
      expect(result).toEqual({ content: 'Hello!' })
    })

    it('throws a descriptive error when fetch returns non-ok status', async () => {
      vi.restoreAllMocks()
      vi.spyOn(global, 'fetch').mockReturnValue(makeFetchError(503, 'Service Unavailable'))
      const { core, handlers } = createCore()
      await register(core)
      await expect(handlers.chat({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow(
        /503/
      )
    })

    it('uses configured host, not a hardcoded URL', async () => {
      vi.restoreAllMocks()
      vi.spyOn(global, 'fetch').mockReturnValue(
        makeFetchOk({ message: { role: 'assistant', content: 'ok' } })
      )
      const { core, handlers } = createCore({
        storage: { 'config.json': { host: 'http://my-custom-host:12345', model: 'llama3' } },
      })
      await register(core)
      await handlers.chat({ messages: [{ role: 'user', content: 'test' }] })
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://my-custom-host:12345'),
        expect.any(Object)
      )
    })
  })

  describe('models handler', () => {
    it('returns an array of model name strings', async () => {
      vi.spyOn(global, 'fetch').mockReturnValue(
        makeFetchOk({ models: [{ name: 'llama3' }, { name: 'mistral' }] })
      )
      const { core, handlers } = createCore()
      await register(core)
      const result = await handlers.models()
      expect(result).toEqual(['llama3', 'mistral'])
    })

    it('returns empty array when fetch fails (graceful)', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'))
      const { core, handlers } = createCore()
      await register(core)
      const result = await handlers.models()
      expect(result).toEqual([])
    })
  })

  describe('health handler', () => {
    it('returns { ok: true } when fetch succeeds', async () => {
      vi.spyOn(global, 'fetch').mockReturnValue(
        makeFetchOk({ models: [] })
      )
      const { core, handlers } = createCore()
      await register(core)
      const result = await handlers.health()
      expect(result).toEqual({ ok: true })
    })

    it('returns { ok: false } when fetch throws (never throws itself)', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('connection refused'))
      const { core, handlers } = createCore()
      await register(core)
      const result = await handlers.health()
      expect(result).toEqual({ ok: false })
    })
  })

  describe('configure handler', () => {
    it('writes config to storage', async () => {
      const { core, handlers } = createCore()
      await register(core)
      await handlers.configure({ model: 'mistral', host: 'http://example.com:11434' })
      expect(core.storage.write).toHaveBeenCalledWith(
        'config.json',
        expect.objectContaining({ model: 'mistral', host: 'http://example.com:11434' })
      )
    })
  })

  describe('query handler', () => {
    it('calls chat with a single user message built from prompt', async () => {
      vi.spyOn(global, 'fetch').mockReturnValue(
        makeFetchOk({ message: { role: 'assistant', content: 'response' } })
      )
      const { core, handlers } = createCore()
      await register(core)
      const result = await handlers.query({ prompt: 'tell me a joke' })
      const body = JSON.parse(global.fetch.mock.calls[0][1].body)
      expect(body.messages).toEqual([{ role: 'user', content: 'tell me a joke' }])
      expect(result).toEqual({ content: 'response' })
    })
  })

  describe('orchestrator function', () => {
    it('calls chat with the raw text as a user message', async () => {
      vi.spyOn(global, 'fetch').mockReturnValue(
        makeFetchOk({ message: { role: 'assistant', content: 'response' } })
      )
      const { core } = createCore()
      await register(core)
      const orchestratorFn = core.registry.registerOrchestrator.mock.calls[0][0]
      const result = await orchestratorFn('what is the capital of France?')
      const body = JSON.parse(global.fetch.mock.calls[0][1].body)
      expect(body.messages).toEqual([{ role: 'user', content: 'what is the capital of France?' }])
      expect(result).toEqual({ content: 'response' })
    })
  })
})
