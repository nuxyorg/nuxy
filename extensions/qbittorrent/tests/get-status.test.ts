import { describe, it, expect } from 'vitest'
import { mapQbitError, probeQbitStatus } from '../utils/get-status.ts'
import type { QbitCredentials } from '../types.ts'

describe('mapQbitError', () => {
  it('maps misconfigured host errors', () => {
    expect(
      mapQbitError(
        new Error('qBittorrent Web UI address is not configured'),
        'http://localhost:8080'
      )
    ).toEqual({
      state: 'misconfigured',
      message: 'qBittorrent Web UI address is not configured',
      host: 'http://localhost:8080',
    })
  })

  it('maps auth failures', () => {
    expect(mapQbitError(new Error('Invalid qBittorrent username or password'))).toEqual({
      state: 'auth_failed',
      message: 'Invalid qBittorrent username or password',
      host: undefined,
    })
  })

  it('maps network failures', () => {
    expect(mapQbitError(new TypeError('fetch failed'))).toEqual({
      state: 'unreachable',
      message: 'fetch failed',
      host: undefined,
    })
  })
})

describe('probeQbitStatus', () => {
  const creds: QbitCredentials = {
    host: 'http://localhost:8080',
    authMethod: 'credentials',
    username: 'admin',
    password: 'adminadmin',
    apiKey: '',
  }

  it('returns ready when the probe succeeds', async () => {
    const result = await probeQbitStatus(
      async () => creds,
      async () => []
    )
    expect(result).toEqual({ state: 'ready', host: 'http://localhost:8080' })
  })

  it('returns misconfigured when host is empty', async () => {
    const result = await probeQbitStatus(
      async () => ({ ...creds, host: '  ' }),
      async () => []
    )
    expect(result.state).toBe('misconfigured')
  })

  it('returns auth_failed when the probe throws an auth error', async () => {
    const result = await probeQbitStatus(
      async () => creds,
      async () => {
        throw new Error('Invalid qBittorrent username or password')
      }
    )
    expect(result).toEqual({
      state: 'auth_failed',
      message: 'Invalid qBittorrent username or password',
      host: 'http://localhost:8080',
    })
  })
})
