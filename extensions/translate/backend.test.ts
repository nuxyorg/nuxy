import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import { register } from './backend.ts'

const DEFAULT_API_URL = 'https://libretranslate.com'

function makeSuccessResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response
}

describe('translate backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => Promise<unknown>>

  beforeEach(async () => {
    ;({ core, handlers } = createMockCore({
      settings: {
        read: vi.fn().mockResolvedValue(null),
        write: vi.fn().mockResolvedValue(undefined),
      },
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn(),
        readImage: vi.fn(),
        writeImage: vi.fn(),
        writeFiles: vi.fn(),
      },
    }))
    await register(core)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('registers a tool', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String) })
    )
  })

  it('registers the translate IPC handler', () => {
    expect(handlers['translate']).toBeDefined()
  })

  describe('translate handler', () => {
    it('returns empty string for empty text', async () => {
      const result = await handlers['translate']({ text: '' })
      expect(result).toEqual({ translatedText: '' })
    })

    it('returns empty string for whitespace-only text', async () => {
      const result = await handlers['translate']({ text: '   ' })
      expect(result).toEqual({ translatedText: '' })
    })

    it('calls LibreTranslate with default settings when none configured', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(makeSuccessResponse({ translatedText: 'Hola mundo' }))
      vi.stubGlobal('fetch', fetchMock)

      const result = await handlers['translate']({ text: 'Hello world', to: 'es' })

      expect(fetchMock).toHaveBeenCalledOnce()
      const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe(`${DEFAULT_API_URL}/translate`)
      const parsedBody = JSON.parse(opts.body as string) as Record<string, string>
      expect(parsedBody.q).toBe('Hello world')
      expect(parsedBody.target).toBe('es')
      expect(parsedBody.source).toBe('auto')
      expect(result).toEqual({ translatedText: 'Hola mundo' })
    })

    it('uses custom apiUrl from settings', async () => {
      const customUrl = 'http://localhost:5000'
      ;({ core, handlers } = createMockCore({
        settings: {
          read: vi.fn().mockImplementation((key: unknown) => {
            if (key === 'apiUrl') return Promise.resolve(customUrl)
            return Promise.resolve(null)
          }),
          write: vi.fn().mockResolvedValue(undefined),
        },
      }))
      await register(core)

      const fetchMock = vi
        .fn()
        .mockResolvedValue(makeSuccessResponse({ translatedText: 'Bonjour' }))
      vi.stubGlobal('fetch', fetchMock)

      await handlers['translate']({ text: 'Hello', to: 'fr' })

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe(`${customUrl}/translate`)
    })

    it('includes api_key in request body when configured', async () => {
      ;({ core, handlers } = createMockCore({
        settings: {
          read: vi.fn().mockImplementation((key: unknown) => {
            if (key === 'apiKey') return Promise.resolve('my-secret-key')
            return Promise.resolve(null)
          }),
          write: vi.fn().mockResolvedValue(undefined),
        },
      }))
      await register(core)

      const fetchMock = vi
        .fn()
        .mockResolvedValue(makeSuccessResponse({ translatedText: 'Merhaba' }))
      vi.stubGlobal('fetch', fetchMock)

      await handlers['translate']({ text: 'Hello', to: 'tr' })

      const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit]
      const parsedBody = JSON.parse(opts.body as string) as Record<string, string>
      expect(parsedBody['api_key']).toBe('my-secret-key')
    })

    it('does not include api_key when not configured', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(makeSuccessResponse({ translatedText: 'Bonjour' }))
      vi.stubGlobal('fetch', fetchMock)

      await handlers['translate']({ text: 'Hello', to: 'fr' })

      const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit]
      const parsedBody = JSON.parse(opts.body as string) as Record<string, string>
      expect(parsedBody['api_key']).toBeUndefined()
    })

    it('uses payload from/to over settings defaults', async () => {
      ;({ core, handlers } = createMockCore({
        settings: {
          read: vi.fn().mockImplementation((key: unknown) => {
            if (key === 'sourceLanguage') return Promise.resolve('en')
            if (key === 'targetLanguage') return Promise.resolve('tr')
            return Promise.resolve(null)
          }),
          write: vi.fn().mockResolvedValue(undefined),
        },
      }))
      await register(core)

      const fetchMock = vi.fn().mockResolvedValue(makeSuccessResponse({ translatedText: 'Hallo' }))
      vi.stubGlobal('fetch', fetchMock)

      await handlers['translate']({ text: 'Hello', from: 'en', to: 'de' })

      const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit]
      const parsedBody = JSON.parse(opts.body as string) as Record<string, string>
      expect(parsedBody.source).toBe('en')
      expect(parsedBody.target).toBe('de')
    })

    it('includes detectedLanguage when API returns it', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        makeSuccessResponse({
          translatedText: 'Hello',
          detectedLanguage: { language: 'tr', confidence: 0.98 },
        })
      )
      vi.stubGlobal('fetch', fetchMock)

      const result = await handlers['translate']({ text: 'Merhaba', to: 'en' })

      expect(result).toEqual({
        translatedText: 'Hello',
        detectedLanguage: 'tr',
      })
    })

    it('throws when the HTTP response is not ok', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(makeSuccessResponse({ error: 'Invalid API key' }, false, 403))
      vi.stubGlobal('fetch', fetchMock)

      await expect(handlers['translate']({ text: 'Hello', to: 'fr' })).rejects.toThrow()
    })

    it('throws when the API returns an error field', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(makeSuccessResponse({ error: 'Language pair not supported' }, true, 200))
      vi.stubGlobal('fetch', fetchMock)

      await expect(handlers['translate']({ text: 'Hello', to: 'xx' })).rejects.toThrow()
    })

    it('throws when fetch itself rejects (network error)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network unreachable')))

      await expect(handlers['translate']({ text: 'Hello', to: 'fr' })).rejects.toThrow()
    })

    it('strips trailing slash from apiUrl', async () => {
      ;({ core, handlers } = createMockCore({
        settings: {
          read: vi.fn().mockImplementation((key: unknown) => {
            if (key === 'apiUrl') return Promise.resolve('http://localhost:5000/')
            return Promise.resolve(null)
          }),
          write: vi.fn().mockResolvedValue(undefined),
        },
      }))
      await register(core)

      const fetchMock = vi.fn().mockResolvedValue(makeSuccessResponse({ translatedText: 'Hola' }))
      vi.stubGlobal('fetch', fetchMock)

      await handlers['translate']({ text: 'Hello', to: 'es' })

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('http://localhost:5000/translate')
    })
  })

  describe('translate:copy handler', () => {
    it('registers the translate:copy IPC handler', () => {
      expect(handlers['translate:copy']).toBeDefined()
    })

    it('copies text to clipboard via core.clipboard.writeText', async () => {
      await handlers['translate:copy']({ text: 'Bonjour le monde' })
      expect(core.clipboard.writeText).toHaveBeenCalledWith('Bonjour le monde')
    })

    it('returns without error for empty text', async () => {
      await expect(handlers['translate:copy']({ text: '' })).resolves.toBeUndefined()
      expect(core.clipboard.writeText).not.toHaveBeenCalled()
    })
  })
})
