import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createQbitClient } from '../utils/qbit-client.ts'
import type { QbitCredentials, RawQbitTorrent } from '../types.ts'

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
    category: '',
    tags: '',
    save_path: '/downloads',
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

function creds(overrides: Partial<QbitCredentials> = {}): QbitCredentials {
  return {
    host: 'http://localhost:8080',
    authMethod: 'credentials',
    username: 'admin',
    password: 'adminadmin',
    apiKey: '',
    ...overrides,
  }
}

describe('createQbitClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('credentials auth', () => {
    it('logs in, stores the session cookie, and lists torrents', async () => {
      const getCredentials = vi.fn().mockResolvedValue(creds())
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/api/v2/auth/login')) {
          return Promise.resolve(makeResponse('Ok.', { cookie: 'SID=sess; path=/' }))
        }
        if (url.endsWith('/api/v2/torrents/info')) {
          return Promise.resolve(makeResponse(SAMPLE_TORRENTS))
        }
        throw new Error(`Unexpected fetch: ${url}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      const client = createQbitClient(getCredentials)
      const torrents = await client.list()

      expect(torrents).toEqual(SAMPLE_TORRENTS)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v2/auth/login',
        expect.objectContaining({ method: 'POST' })
      )

      const infoCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/torrents/info'))
      expect(infoCall?.[1]?.headers).toMatchObject({ Cookie: 'SID=sess' })
    })

    it('normalizes a host with trailing slashes', async () => {
      const getCredentials = vi.fn().mockResolvedValue(creds({ host: 'http://localhost:8080///' }))
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/api/v2/auth/login')) {
          return Promise.resolve(makeResponse('Ok.', { cookie: 'SID=sess; path=/' }))
        }
        if (url.endsWith('/api/v2/torrents/info')) {
          return Promise.resolve(makeResponse([]))
        }
        throw new Error(`Unexpected fetch: ${url}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      await createQbitClient(getCredentials).list()

      expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8080/api/v2/auth/login')
    })

    it('accepts qBittorrent 5.2+ QBT_SID cookie and empty 204 login body', async () => {
      const getCredentials = vi.fn().mockResolvedValue(creds())
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/api/v2/auth/login')) {
          return Promise.resolve(
            makeResponse('', {
              ok: true,
              status: 204,
              cookie: 'QBT_SID_8080=sess; HttpOnly; path=/',
            })
          )
        }
        if (url.endsWith('/api/v2/torrents/info')) {
          return Promise.resolve(makeResponse([]))
        }
        throw new Error(`Unexpected fetch: ${url}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      await createQbitClient(getCredentials).list()

      const infoCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/torrents/info'))
      expect(infoCall?.[1]?.headers).toMatchObject({ Cookie: 'QBT_SID_8080=sess' })
    })

    it('throws on invalid credentials (Fails.)', async () => {
      const getCredentials = vi.fn().mockResolvedValue(creds())
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(makeResponse('Fails.', { ok: false, status: 401 }))
      )

      await expect(createQbitClient(getCredentials).list()).rejects.toThrow(
        'Invalid qBittorrent username or password'
      )
    })

    it('throws on unauthorized login (401 Unauthorized body)', async () => {
      const getCredentials = vi.fn().mockResolvedValue(creds())
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(makeResponse('Unauthorized', { ok: false, status: 401, cookie: null }))
      )

      await expect(createQbitClient(getCredentials).list()).rejects.toThrow(
        'Invalid qBittorrent username or password'
      )
    })

    it('throws when login succeeds but no session cookie is returned', async () => {
      const getCredentials = vi.fn().mockResolvedValue(creds())
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse('Ok.', { cookie: null })))

      await expect(createQbitClient(getCredentials).list()).rejects.toThrow(
        'qBittorrent did not return a session cookie'
      )
    })

    it('throws on unexpected login HTTP status', async () => {
      const getCredentials = vi.fn().mockResolvedValue(creds())
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(makeResponse('Server Error', { ok: false, status: 500 }))
      )

      await expect(createQbitClient(getCredentials).list()).rejects.toThrow(
        'Login failed: HTTP 500'
      )
    })

    it('retries once after a 403 by clearing the session', async () => {
      const getCredentials = vi.fn().mockResolvedValue(creds())
      let infoCalls = 0

      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/api/v2/auth/login')) {
          return Promise.resolve(makeResponse('Ok.', { cookie: 'SID=sess; path=/' }))
        }
        if (url.endsWith('/api/v2/torrents/info')) {
          infoCalls += 1
          if (infoCalls === 1) {
            return Promise.resolve(makeResponse('', { ok: false, status: 403 }))
          }
          return Promise.resolve(makeResponse([]))
        }
        throw new Error(`Unexpected fetch: ${url}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      await createQbitClient(getCredentials).list()

      expect(infoCalls).toBe(2)
      expect(fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/auth/login'))).toHaveLength(
        2
      )
    })
  })

  describe('apikey auth', () => {
    it('sends Bearer token without a login round-trip', async () => {
      const getCredentials = vi
        .fn()
        .mockResolvedValue(creds({ authMethod: 'apikey', apiKey: 'secret-token' }))
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/api/v2/torrents/info')) {
          return Promise.resolve(makeResponse([]))
        }
        throw new Error(`Unexpected fetch: ${url}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      await createQbitClient(getCredentials).list()

      expect(fetchMock).not.toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.anything()
      )
      expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
        Authorization: 'Bearer secret-token',
      })
    })

    it('throws when apikey auth is selected but the key is empty', async () => {
      const getCredentials = vi
        .fn()
        .mockResolvedValue(creds({ authMethod: 'apikey', apiKey: '  ' }))
      vi.stubGlobal('fetch', vi.fn())

      await expect(createQbitClient(getCredentials).list()).rejects.toThrow(
        'qBittorrent API key is not configured'
      )
    })
  })

  describe('torrent operations', () => {
    function mockAuthedFetch(): ReturnType<typeof vi.fn> {
      const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.endsWith('/api/v2/auth/login')) {
          return Promise.resolve(makeResponse('Ok.', { cookie: 'SID=sess; path=/' }))
        }
        if (url.endsWith('/api/v2/torrents/info')) {
          return Promise.resolve(makeResponse(SAMPLE_TORRENTS))
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
        throw new Error(`Unexpected fetch: ${url} ${JSON.stringify(init)}`)
      })
      vi.stubGlobal('fetch', fetchMock)
      return fetchMock
    }

    it('add posts urls as multipart form data', async () => {
      const getCredentials = vi.fn().mockResolvedValue(creds())
      const fetchMock = mockAuthedFetch()
      const client = createQbitClient(getCredentials)

      await client.add('magnet:?xt=urn:btih:abc123')

      const addCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/torrents/add'))
      const body = addCall?.[1]?.body as FormData
      expect(body.get('urls')).toBe('magnet:?xt=urn:btih:abc123')
    })

    it('throws when add returns Fails.', async () => {
      const getCredentials = vi.fn().mockResolvedValue(creds())
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/api/v2/auth/login')) {
          return Promise.resolve(makeResponse('Ok.', { cookie: 'SID=sess; path=/' }))
        }
        if (url.endsWith('/api/v2/torrents/add')) {
          return Promise.resolve(makeResponse('Fails.'))
        }
        throw new Error(`Unexpected fetch: ${url}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      await expect(createQbitClient(getCredentials).add('bad')).rejects.toThrow(
        'qBittorrent rejected the torrent'
      )
    })

    it('throws when add JSON reports only failures', async () => {
      const getCredentials = vi.fn().mockResolvedValue(creds())
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/api/v2/auth/login')) {
          return Promise.resolve(makeResponse('Ok.', { cookie: 'SID=sess; path=/' }))
        }
        if (url.endsWith('/api/v2/torrents/add')) {
          return Promise.resolve(
            makeResponse('{"success_count":0,"pending_count":0,"failure_count":1}')
          )
        }
        throw new Error(`Unexpected fetch: ${url}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      await expect(createQbitClient(getCredentials).add('bad')).rejects.toThrow(
        'qBittorrent rejected the torrent'
      )
    })

    it('does not treat partial-success JSON as failure', async () => {
      const getCredentials = vi.fn().mockResolvedValue(creds())
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/api/v2/auth/login')) {
          return Promise.resolve(makeResponse('Ok.', { cookie: 'SID=sess; path=/' }))
        }
        if (url.endsWith('/api/v2/torrents/add')) {
          return Promise.resolve(
            makeResponse('{"success_count":1,"pending_count":0,"failure_count":1}')
          )
        }
        throw new Error(`Unexpected fetch: ${url}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      await expect(createQbitClient(getCredentials).add('magnet:?xt=urn:btih:abc')).resolves.toBe(
        undefined
      )
    })

    it.each([
      ['pause', 'stop'],
      ['resume', 'start'],
      ['recheck', 'recheck'],
      ['reannounce', 'reannounce'],
    ] as const)('%s posts pipe-joined hashes to /torrents/%s', async (method, endpoint) => {
      const getCredentials = vi.fn().mockResolvedValue(creds())
      const fetchMock = mockAuthedFetch()
      const client = createQbitClient(getCredentials)

      await client[method](['hash-a', 'hash-b'])

      const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith(`/torrents/${endpoint}`))
      const body = call?.[1]?.body as URLSearchParams
      expect(body.toString()).toBe('hashes=hash-a%7Chash-b')
    })

    it('falls back to legacy pause/resume endpoints on qBittorrent 4.x', async () => {
      const getCredentials = vi.fn().mockResolvedValue(creds())
      const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.endsWith('/api/v2/auth/login')) {
          return Promise.resolve(makeResponse('Ok.', { cookie: 'SID=sess; path=/' }))
        }
        if (url.endsWith('/api/v2/torrents/stop') || url.endsWith('/api/v2/torrents/start')) {
          return Promise.resolve(makeResponse('', { ok: false, status: 404 }))
        }
        if (url.endsWith('/api/v2/torrents/pause') || url.endsWith('/api/v2/torrents/resume')) {
          return Promise.resolve(makeResponse(''))
        }
        throw new Error(`Unexpected fetch: ${url}`)
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createQbitClient(getCredentials)

      await client.pause(['abc'])
      await client.resume(['abc'])

      expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('/torrents/stop'))).toBe(true)
      expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('/torrents/pause'))).toBe(true)
      expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('/torrents/start'))).toBe(true)
      expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('/torrents/resume'))).toBe(true)
    })

    it('remove posts hashes and deleteFiles flag', async () => {
      const getCredentials = vi.fn().mockResolvedValue(creds())
      const fetchMock = mockAuthedFetch()
      const client = createQbitClient(getCredentials)

      await client.remove(['abc123'], true)

      const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/torrents/delete'))
      const body = call?.[1]?.body as URLSearchParams
      expect(body.toString()).toBe('hashes=abc123&deleteFiles=true')
    })

    it('throws on non-ok authed fetch responses', async () => {
      const getCredentials = vi.fn().mockResolvedValue(creds())
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/api/v2/auth/login')) {
          return Promise.resolve(makeResponse('Ok.', { cookie: 'SID=sess; path=/' }))
        }
        if (url.endsWith('/api/v2/torrents/stop')) {
          return Promise.resolve(makeResponse('', { ok: false, status: 500 }))
        }
        throw new Error(`Unexpected fetch: ${url}`)
      })
      vi.stubGlobal('fetch', fetchMock)

      await expect(createQbitClient(getCredentials).pause(['abc'])).rejects.toThrow(
        'qBittorrent request failed: HTTP 500'
      )
    })
  })
})
