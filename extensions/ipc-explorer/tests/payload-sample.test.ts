import { describe, it, expect } from 'vitest'
import { formatPayloadSample, payloadSampleForChannel } from '../utils/payload-sample.ts'
import type { IpcTarget } from '../utils/parse-targets.ts'

describe('payload-sample', () => {
  it('formats undefined as empty object', () => {
    expect(formatPayloadSample(undefined)).toBe('{}')
  })

  it('pretty-prints sample objects', () => {
    expect(formatPayloadSample({ url: 'magnet:?xt=...' })).toBe('{\n  "url": "magnet:?xt=..."\n}')
  })

  it('returns sample for channel from target', () => {
    const target: IpcTarget = {
      extId: 'com.nuxy.qbittorrent',
      name: 'qBittorrent',
      disabled: false,
      channels: ['add', 'getStatus'],
      publicChannels: ['add', 'getStatus'],
      privateChannels: [],
      ipcSamples: { add: { url: 'magnet:?xt=...' } },
      callable: true,
    }

    expect(payloadSampleForChannel(target, 'add')).toBe('{\n  "url": "magnet:?xt=..."\n}')
    expect(payloadSampleForChannel(target, 'getStatus')).toBe('{}')
  })
})
