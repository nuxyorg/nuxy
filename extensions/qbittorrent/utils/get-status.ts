import type { QbitCredentials, QbitStatusResult } from '../types.ts'

function normalizeHost(host: string): string {
  return host.trim().replace(/\/+$/, '')
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return (
    err.name === 'TypeError' ||
    msg.includes('fetch failed') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('network') ||
    msg.includes('socket')
  )
}

export function mapQbitError(err: unknown, host?: string): QbitStatusResult {
  if (!(err instanceof Error)) {
    return { state: 'error', message: 'Unknown qBittorrent error', host }
  }

  const message = err.message

  if (message.includes('Web UI address is not configured')) {
    return { state: 'misconfigured', message, host }
  }
  if (message.includes('API key is not configured')) {
    return { state: 'misconfigured', message, host }
  }
  if (message.includes('Invalid qBittorrent username or password')) {
    return { state: 'auth_failed', message, host }
  }
  if (isNetworkError(err)) {
    return { state: 'unreachable', message, host }
  }

  return { state: 'error', message, host }
}

/**
 * Probes qBittorrent WebUI reachability by running a lightweight authenticated
 * API call. Used by the `getStatus` IPC channel for cross-extension handoffs.
 */
export async function probeQbitStatus(
  getCredentials: () => Promise<QbitCredentials>,
  probe: () => Promise<unknown>
): Promise<QbitStatusResult> {
  let host: string | undefined
  try {
    const creds = await getCredentials()
    host = normalizeHost(creds.host)
    if (!host) {
      return {
        state: 'misconfigured',
        message: 'qBittorrent Web UI address is not configured',
      }
    }
    if (creds.authMethod === 'apikey' && !creds.apiKey.trim()) {
      return {
        state: 'misconfigured',
        message: 'qBittorrent API key is not configured',
        host,
      }
    }

    await probe()
    return { state: 'ready', host }
  } catch (err) {
    return mapQbitError(err, host)
  }
}
