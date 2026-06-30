import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext } from '@nuxyorg/extension-sdk'
import { createMockCore } from '@nuxyorg/extension-sdk/testing'
import { register } from '../backend.ts'
import type { QbitStatusResult, RawQbitTorrent } from '../types.ts'

const SAMPLE_TORRENTS: RawQbitTorrent[] = [
  {
    hash: 'abc123',
    name: 'Ubuntu ISO',
    size: 4_000_000_000,
    progress: 0.5,
    dlspeed: 1024,
    upspeed: 0,
    eta: 3600,
    state: 'downloading',
    category: 'linux',
    tags: '',
    save_path: '/downloads',
  },
  {
    hash: 'def456',
    name: 'Already Has Magnet',
    size: 1_000_000,
    progress: 1,
    dlspeed: 0,
    upspeed: 0,
    eta: 8640000,
    state: 'pausedUP',
    category: '',
    tags: 'seeded',
    save_path: '/downloads',
    magnet_uri: 'magnet:?xt=urn:btih:def456&dn=Already+Has+Magnet&tr=http://tracker.example.com',
  },
]

function makeResponse(
  body: unknown,
  opts: { ok?: boolean; status?: number; cookie?: string | null } = {}
) {
  const { ok = true, status = ok ? 200 : 500, cookie = null } = opts
  return {
    ok,
    status,
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : ''),
    json: vi.fn().mockResolvedValue(body),
    headers: { get: (name: string) => (name.toLowerCase() === 'set-cookie' ? cookie : null) },
  }
}

function mockFetchRouter(
  opts: { loginOk?: boolean; torrents?: RawQbitTorrent[] } = {}
): ReturnType<typeof vi.fn> {
  const { loginOk = true, torrents = SAMPLE_TORRENTS } = opts

  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.endsWith('/api/v2/auth/login')) {
      if (!loginOk) return Promise.resolve(makeResponse('Fails.'))
      return Promise.resolve(makeResponse('Ok.', { cookie: 'SID=test-session; path=/' }))
    }
    if (url.endsWith('/api/v2/torrents/info')) {
      return Promise.resolve(makeResponse(torrents))
    }
    if (url.endsWith('/api/v2/torrents/add')) {
      return Promise.resolve(makeResponse('Ok.'))
    }
    if (
      url.endsWith('/api/v2/torrents/stop') ||
      url.endsWith('/api/v2/torrents/start') ||
      url.endsWith('/api/v2/torrents/pause') ||
      url.endsWith('/api/v2/torrents/resume') ||
      url.endsWith('/api/v2/torrents/recheck') ||
      url.endsWith('/api/v2/torrents/reannounce') ||
      url.endsWith('/api/v2/torrents/delete')
    ) {
      return Promise.resolve(makeResponse(''))
    }
    throw new Error(`Unexpected fetch: ${String(url)} ${JSON.stringify(init)}`)
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('qbittorrent backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => Promise<unknown>>
  let publicChannels: Set<string>

  beforeEach(() => {
    ;({ core, handlers, publicChannels } = createMockCore({
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      shell: {
        open: vi.fn().mockResolvedValue(undefined),
      },
      settings: {
        read: vi.fn().mockImplementation(async (key: string) => {
          if (key === 'host') return 'http://localhost:8080'
          if (key === 'username') return 'admin'
          if (key === 'password') return 'adminadmin'
          return null
        }),
      },
    }))
    register(core)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers as a tool', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'qbittorrent' })
  })

  it('exposes only getStatus and add publicly, matching manifest.ipc.public', () => {
    expect(publicChannels).toEqual(new Set(['getStatus', 'add']))
  })

  describe('getStatus', () => {
    it('returns ready when WebUI responds', async () => {
      mockFetchRouter()
      const result = await handlers.getStatus()
      expect(result).toEqual({ state: 'ready', host: 'http://localhost:8080' })
    })

    it('returns auth_failed when login fails', async () => {
      mockFetchRouter({ loginOk: false })
      const result = await handlers.getStatus()
      expect(result).toEqual({
        state: 'auth_failed',
        message: 'Invalid qBittorrent username or password',
        host: 'http://localhost:8080',
      })
    })

    it('returns misconfigured when host is empty', async () => {
      core.settings.read = vi.fn().mockResolvedValue('')
      const result = (await handlers.getStatus()) as QbitStatusResult
      expect(result.state).toBe('misconfigured')
    })
  })

  describe('list', () => {
    it('logs in and maps torrents, preferring an existing magnet_uri', async () => {
      const fetchMock = mockFetchRouter()
      const result = await handlers.list()

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v2/auth/login',
        expect.objectContaining({ method: 'POST' })
      )
      expect(result).toEqual([
        {
          hash: 'abc123',
          name: 'Ubuntu ISO',
          size: 4_000_000_000,
          progress: 0.5,
          dlspeed: 1024,
          upspeed: 0,
          eta: 3600,
          state: 'downloading',
          category: 'linux',
          tags: '',
          savePath: '/downloads',
          magnetUri: 'magnet:?xt=urn:btih:abc123&dn=Ubuntu%20ISO',
        },
        {
          hash: 'def456',
          name: 'Already Has Magnet',
          size: 1_000_000,
          progress: 1,
          dlspeed: 0,
          upspeed: 0,
          eta: 8640000,
          state: 'pausedUP',
          category: '',
          tags: 'seeded',
          savePath: '/downloads',
          magnetUri:
            'magnet:?xt=urn:btih:def456&dn=Already+Has+Magnet&tr=http://tracker.example.com',
        },
      ])
    })

    it('sends the session cookie on the follow-up request', async () => {
      const fetchMock = mockFetchRouter()
      await handlers.list()

      const infoCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/torrents/info'))
      expect(infoCall?.[1]?.headers).toMatchObject({ Cookie: 'SID=test-session' })
    })

    it('throws when login fails', async () => {
      mockFetchRouter({ loginOk: false })
      await expect(handlers.list()).rejects.toThrow('Invalid qBittorrent username or password')
    })

    it('accepts qBittorrent 5.2+ login (204 empty body, QBT_SID cookie)', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/api/v2/auth/login')) {
          return Promise.resolve(
            makeResponse('', {
              ok: true,
              status: 204,
              cookie: 'QBT_SID_8080=test-session; HttpOnly; path=/',
            })
          )
        }
        if (url.endsWith('/api/v2/torrents/info')) {
          return Promise.resolve(makeResponse(SAMPLE_TORRENTS))
        }
        throw new Error(`Unexpected fetch: ${String(url)}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await handlers.list()
      expect(result).toHaveLength(2)

      const infoCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/torrents/info'))
      expect(infoCall?.[1]?.headers).toMatchObject({ Cookie: 'QBT_SID_8080=test-session' })
    })

    it('throws on qBittorrent 5.2+ unauthorized login (401)', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/api/v2/auth/login')) {
          return Promise.resolve(
            makeResponse('Unauthorized', { ok: false, status: 401, cookie: null })
          )
        }
        throw new Error(`Unexpected fetch: ${String(url)}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      await expect(handlers.list()).rejects.toThrow('Invalid qBittorrent username or password')
    })

    it('throws when the configured host is empty', async () => {
      core.settings.read = vi.fn().mockResolvedValue('')
      mockFetchRouter()
      await expect(handlers.list()).rejects.toThrow('qBittorrent Web UI address is not configured')
    })
  })

  describe('add', () => {
    it('posts the url as multipart form data', async () => {
      const fetchMock = mockFetchRouter()
      await handlers.add({ url: 'magnet:?xt=urn:btih:abc123' })

      const addCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/torrents/add'))
      expect(addCall).toBeDefined()
      const body = addCall?.[1]?.body as FormData
      expect(body.get('urls')).toBe('magnet:?xt=urn:btih:abc123')
    })

    it('throws when qBittorrent rejects the torrent', async () => {
      mockFetchRouter()
      vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
        if (String(url).endsWith('/api/v2/auth/login')) {
          return Promise.resolve(makeResponse('Ok.', { cookie: 'SID=test-session; path=/' }) as any)
        }
        if (String(url).endsWith('/api/v2/torrents/add')) {
          return Promise.resolve(makeResponse('Fails.') as any)
        }
        throw new Error(`Unexpected fetch: ${String(url)}`)
      })

      await expect(handlers.add({ url: 'not-a-real-torrent' })).rejects.toThrow(
        'qBittorrent rejected the torrent'
      )
    })
  })

  describe('torrent actions', () => {
    it.each([
      ['pause', 'stop'],
      ['resume', 'start'],
      ['recheck', 'recheck'],
      ['reannounce', 'reannounce'],
    ])('%s posts the hash to /api/v2/torrents/%s', async (channel, endpoint) => {
      const fetchMock = mockFetchRouter()
      await handlers[channel]({ hash: 'abc123' })

      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith(`/torrents/${endpoint}`)
      )
      expect(call).toBeDefined()
      const body = call?.[1]?.body as URLSearchParams
      expect(body.toString()).toBe('hashes=abc123')
    })

    it('remove posts the hash and deleteFiles flag', async () => {
      const fetchMock = mockFetchRouter()
      await handlers.remove({ hash: 'abc123', deleteFiles: true })

      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/torrents/delete'))
      const body = call?.[1]?.body as URLSearchParams
      expect(body.toString()).toBe('hashes=abc123&deleteFiles=true')
    })
  })

  describe('copyMagnet / copySavePath', () => {
    it('writes the magnet uri to the clipboard', async () => {
      await handlers.copyMagnet({ magnetUri: 'magnet:?xt=urn:btih:abc123' })
      expect(core.clipboard.writeText).toHaveBeenCalledWith('magnet:?xt=urn:btih:abc123')
    })

    it('writes the save path to the clipboard', async () => {
      await handlers.copySavePath({ savePath: '/downloads' })
      expect(core.clipboard.writeText).toHaveBeenCalledWith('/downloads')
    })
  })

  describe('openSavePath', () => {
    it('opens the save path via the shell', async () => {
      await handlers.openSavePath({ savePath: '/downloads/ubuntu' })
      expect(core.shell.open).toHaveBeenCalledWith('/downloads/ubuntu')
    })

    it('rejects an empty save path', async () => {
      await expect(handlers.openSavePath({ savePath: '' })).rejects.toThrow('No save path to open')
      expect(core.shell.open).not.toHaveBeenCalled()
    })
  })

  describe('apikey auth', () => {
    beforeEach(() => {
      core.settings.read = vi.fn().mockImplementation(async (key: string) => {
        if (key === 'host') return 'http://localhost:8080'
        if (key === 'authMethod') return 'apikey'
        if (key === 'apiKey') return 'proxy-token'
        return null
      })
      register(core)
    })

    it('uses Bearer auth without calling /auth/login', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/api/v2/torrents/info')) {
          return Promise.resolve(makeResponse(SAMPLE_TORRENTS))
        }
        throw new Error(`Unexpected fetch: ${String(url)}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      await handlers.list()

      expect(fetchMock).not.toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.anything()
      )
      const infoCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/torrents/info'))
      expect(infoCall?.[1]?.headers).toMatchObject({ Authorization: 'Bearer proxy-token' })
    })
  })

  describe('add logging', () => {
    it('logs when a torrent is added', async () => {
      mockFetchRouter()
      await handlers.add({ url: 'magnet:?xt=urn:btih:abc123' })
      expect(core.logger.info).toHaveBeenCalledWith('Added torrent: magnet:?xt=urn:btih:abc123')
    })
  })

  describe('remove logging', () => {
    it('logs when a torrent is removed', async () => {
      mockFetchRouter()
      await handlers.remove({ hash: 'abc123', deleteFiles: false })
      expect(core.logger.info).toHaveBeenCalledWith('Removed torrent abc123 (deleteFiles=false)')
    })
  })
})
