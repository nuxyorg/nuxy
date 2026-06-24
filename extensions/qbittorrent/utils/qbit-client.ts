import type { QbitCredentials, RawQbitTorrent } from '../types.ts'

export interface QbitClient {
  list(): Promise<RawQbitTorrent[]>
  add(url: string): Promise<void>
  pause(hashes: string[]): Promise<void>
  resume(hashes: string[]): Promise<void>
  recheck(hashes: string[]): Promise<void>
  reannounce(hashes: string[]): Promise<void>
  remove(hashes: string[], deleteFiles: boolean): Promise<void>
}

function normalizeHost(host: string): string {
  return host.trim().replace(/\/+$/, '')
}

type SessionCookie = { name: string; value: string }

/** qBittorrent 5.2+ uses `QBT_SID_<port>`; older releases used plain `SID`. */
function parseSessionCookie(setCookie: string): SessionCookie | null {
  const match = /(?:^|,\s*)((?:QBT_SID(?:_\d+)?|SID))=([^;]+)/i.exec(setCookie)
  if (!match) return null
  return { name: match[1], value: match[2] }
}

function sessionHeader(session: SessionCookie): string {
  return `${session.name}=${session.value}`
}

function isLoginFailure(status: number, body: string): boolean {
  const text = body.trim()
  return status === 401 || text === 'Fails.' || text === 'Unauthorized'
}

function isAddFailure(body: string): boolean {
  const text = body.trim()
  if (text === 'Fails.') return true
  if (!text.startsWith('{')) return false
  try {
    const result = JSON.parse(text) as {
      success_count?: number
      pending_count?: number
      failure_count?: number
    }
    const success = result.success_count ?? 0
    const pending = result.pending_count ?? 0
    const failure = result.failure_count ?? 0
    return failure > 0 && success === 0 && pending === 0
  } catch {
    return false
  }
}

/**
 * Thin wrapper around qBittorrent's WebUI API (`/api/v2/...`).
 *
 * Two auth methods are supported:
 * - `credentials`: qBittorrent's native cookie-based session. The cookie is
 *   tracked in closure state and re-sent manually on every request — `fetch`
 *   does not persist cookies across calls in the worker runtime this backend
 *   executes in.
 * - `apikey`: qBittorrent itself has no concept of API keys, but it's common
 *   to put it behind a reverse proxy that injects/validates a static token
 *   (e.g. via a header) while WebUI auth is left open on the proxied side.
 *   In this mode no login round-trip happens — the key is sent as a Bearer
 *   token on every request instead of a session cookie.
 */
export function createQbitClient(getCredentials: () => Promise<QbitCredentials>): QbitClient {
  let session: SessionCookie | null = null
  let sessionHost: string | null = null

  async function login(creds: QbitCredentials): Promise<string> {
    const host = normalizeHost(creds.host)
    const res = await fetch(`${host}/api/v2/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: host },
      body: new URLSearchParams({ username: creds.username, password: creds.password }),
    })

    const text = await res.text()
    if (isLoginFailure(res.status, text)) {
      throw new Error('Invalid qBittorrent username or password')
    }
    if (!res.ok) throw new Error(`Login failed: HTTP ${res.status}`)

    const trimmed = text.trim()
    if (trimmed !== '' && trimmed !== 'Ok.') {
      throw new Error('Invalid qBittorrent username or password')
    }

    const cookie = parseSessionCookie(res.headers.get('set-cookie') ?? '')
    if (!cookie) throw new Error('qBittorrent did not return a session cookie')

    session = cookie
    sessionHost = host
    return host
  }

  async function authHeaders(
    creds: QbitCredentials
  ): Promise<{ host: string; headers: Record<string, string> }> {
    const host = normalizeHost(creds.host)

    if (creds.authMethod === 'apikey') {
      if (!creds.apiKey.trim()) throw new Error('qBittorrent API key is not configured')
      return { host, headers: { Authorization: `Bearer ${creds.apiKey.trim()}`, Referer: host } }
    }

    if (!session || sessionHost !== host) await login(creds)
    if (!session) throw new Error('qBittorrent session is not initialized')
    return { host, headers: { Cookie: sessionHeader(session), Referer: host } }
  }

  async function authedFetch(
    path: string,
    init: RequestInit = {},
    retried = false
  ): Promise<Response> {
    const creds = await getCredentials()
    const { host, headers } = await authHeaders(creds)

    const res = await fetch(`${host}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), ...headers },
    })

    if (res.status === 403 && !retried && creds.authMethod !== 'apikey') {
      session = null
      return authedFetch(path, init, true)
    }
    if (!res.ok) throw new Error(`qBittorrent request failed: HTTP ${res.status}`)
    return res
  }

  function postForm(path: string, fields: Record<string, string>): Promise<void> {
    return authedFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields),
    }).then(() => undefined)
  }

  /** qBittorrent 5.0+ renamed pause→stop and resume→start; fall back for 4.x. */
  async function postFormWithLegacyFallback(
    modernPath: string,
    legacyPath: string,
    fields: Record<string, string>
  ): Promise<void> {
    try {
      await postForm(modernPath, fields)
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) {
        await postForm(legacyPath, fields)
        return
      }
      throw err
    }
  }

  return {
    async list() {
      const res = await authedFetch('/api/v2/torrents/info')
      return (await res.json()) as RawQbitTorrent[]
    },

    async add(url: string) {
      const creds = await getCredentials()
      const { host, headers } = await authHeaders(creds)

      const form = new FormData()
      form.append('urls', url)

      const res = await fetch(`${host}/api/v2/torrents/add`, {
        method: 'POST',
        headers,
        body: form,
      })
      if (!res.ok) throw new Error(`Failed to add torrent: HTTP ${res.status}`)

      const text = await res.text()
      if (isAddFailure(text)) throw new Error('qBittorrent rejected the torrent')
    },

    pause(hashes) {
      return postFormWithLegacyFallback('/api/v2/torrents/stop', '/api/v2/torrents/pause', {
        hashes: hashes.join('|'),
      })
    },
    resume(hashes) {
      return postFormWithLegacyFallback('/api/v2/torrents/start', '/api/v2/torrents/resume', {
        hashes: hashes.join('|'),
      })
    },
    recheck(hashes) {
      return postForm('/api/v2/torrents/recheck', { hashes: hashes.join('|') })
    },
    reannounce(hashes) {
      return postForm('/api/v2/torrents/reannounce', { hashes: hashes.join('|') })
    },
    remove(hashes, deleteFiles) {
      return postForm('/api/v2/torrents/delete', {
        hashes: hashes.join('|'),
        deleteFiles: String(deleteFiles),
      })
    },
  }
}
