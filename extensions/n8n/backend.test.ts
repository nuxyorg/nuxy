import { describe, it, expect, vi, afterEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import { register } from './backend.ts'

type Handlers = Record<string, (...args: unknown[]) => Promise<unknown>>

function createCore(): { core: CoreContext; handlers: Handlers } {
  const { core, handlers } = createMockCore(vi)
  return { core, handlers }
}

afterEach(() => vi.restoreAllMocks())

describe('n8n backend', () => {
  it('registers as a tool named n8n', async () => {
    const { core } = createCore()
    await register(core)
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'n8n' })
  })

  it('n8n:configure writes config to storage', async () => {
    const { core, handlers } = createCore()
    await register(core)
    await handlers['n8n:configure']({ baseUrl: 'http://my-n8n:5678', apiKey: 'secret' })
    expect(core.storage.write).toHaveBeenCalledWith('config.json', {
      baseUrl: 'http://my-n8n:5678',
      apiKey: 'secret',
    })
  })

  it('n8n:configure updates in-memory baseUrl and apiKey used by subsequent calls', async () => {
    const { core, handlers } = createCore()
    await register(core)
    await handlers['n8n:configure']({ baseUrl: 'http://updated:5678', apiKey: 'new-key' })

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
      text: () => Promise.resolve(''),
    } as Response)

    await handlers['n8n:listWorkflows']()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('http://updated:5678'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-N8N-API-KEY': 'new-key' }),
      })
    )
  })

  describe('n8n:status', () => {
    it('returns { ok: true } when fetch succeeds with 200', async () => {
      const { core, handlers } = createCore()
      await register(core)
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [{ id: '1' }] }),
        text: () => Promise.resolve(''),
      } as Response)
      const result = await handlers['n8n:status']()
      expect((result as { ok: boolean }).ok).toBe(true)
    })

    it('returns { ok: false } when fetch throws (never throws itself)', async () => {
      const { core, handlers } = createCore()
      await register(core)
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('connection refused'))
      const result = await handlers['n8n:status']()
      expect(result).toEqual({ ok: false })
    })

    it('returns { ok: false } when fetch returns non-ok status', async () => {
      const { core, handlers } = createCore()
      await register(core)
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('Unauthorized'),
      } as Response)
      const result = await handlers['n8n:status']()
      expect(result).toEqual({ ok: false })
    })
  })

  describe('n8n:listWorkflows', () => {
    it('sends X-N8N-API-KEY header', async () => {
      const { core, handlers } = createCore()
      await register(core)
      await handlers['n8n:configure']({ baseUrl: 'http://localhost:5678', apiKey: 'my-api-key' })
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
        text: () => Promise.resolve(''),
      } as Response)
      await handlers['n8n:listWorkflows']()
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-N8N-API-KEY': 'my-api-key' }),
        })
      )
    })

    it('returns array of workflows from API response', async () => {
      const { core, handlers } = createCore()
      await register(core)
      const mockWorkflows = [
        { id: '1', name: 'My Workflow', active: true },
        { id: '2', name: 'Another', active: false },
      ]
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkflows }),
        text: () => Promise.resolve(''),
      } as Response)
      const result = await handlers['n8n:listWorkflows']()
      expect(result).toEqual([
        { id: '1', name: 'My Workflow', active: true },
        { id: '2', name: 'Another', active: false },
      ])
    })

    it('throws when API returns non-ok status', async () => {
      const { core, handlers } = createCore()
      await register(core)
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('Forbidden'),
      } as Response)
      await expect(handlers['n8n:listWorkflows']()).rejects.toThrow()
    })
  })

  describe('n8n:triggerWebhook', () => {
    it('POSTs to /webhook/<path> without API key', async () => {
      const { core, handlers } = createCore()
      await register(core)
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ triggered: true }),
        text: () => Promise.resolve(''),
      } as Response)
      await handlers['n8n:triggerWebhook']({ webhookPath: 'my-hook', payload: { foo: 'bar' } })
      const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit & { headers?: Record<string, string> },
      ]
      expect(url).toContain('/webhook/my-hook')
      expect(options.method).toBe('POST')
      expect(options.headers?.['X-N8N-API-KEY']).toBeUndefined()
    })

    it('returns { status, body } from the response', async () => {
      const { core, handlers } = createCore()
      await register(core)
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ triggered: true }),
        text: () => Promise.resolve(''),
      } as Response)
      const result = await handlers['n8n:triggerWebhook']({ webhookPath: 'my-hook' })
      expect(result).toEqual({ status: 200, body: { triggered: true } })
    })
  })

  describe('n8n:executions', () => {
    it('calls correct endpoint with workflowId and limit params', async () => {
      const { core, handlers } = createCore()
      await register(core)
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
        text: () => Promise.resolve(''),
      } as Response)
      await handlers['n8n:executions']({ workflowId: 'wf-123', limit: 10 })
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/executions?workflowId=wf-123&limit=10'),
        expect.any(Object)
      )
    })
  })
})
