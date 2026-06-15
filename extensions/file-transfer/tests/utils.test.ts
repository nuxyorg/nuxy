import { describe, it, expect } from 'vitest'
import {
  generateTransferCode,
  peerIdToDisplayCode,
  transferCodeToPeerId,
} from '../utils/transfer-code.ts'
import {
  createProgress,
  formatBytes,
  formatEta,
  formatSpeed,
  SpeedTracker,
} from '../utils/transfer-stats.ts'
import {
  decodeControlMessage,
  encodeDoneMessage,
  encodeMetaMessage,
} from '../utils/transfer-protocol.ts'

describe('transfer-code', () => {
  it('generates FT-XXXX-XXXX display codes', () => {
    const code = generateTransferCode()
    expect(code).toMatch(/^FT-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
  })

  it('normalizes display code to peer id', () => {
    expect(transferCodeToPeerId('FT-A7F3-9K2M')).toBe('ft-a7f39k2m')
    expect(transferCodeToPeerId('ft-a7f39k2m')).toBe('ft-a7f39k2m')
    expect(transferCodeToPeerId('invalid')).toBeNull()
  })

  it('formats peer id for display', () => {
    expect(peerIdToDisplayCode('ft-a7f39k2m')).toBe('FT-A7F3-9K2M')
  })
})

describe('transfer-stats', () => {
  it('formats bytes and speed', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatSpeed(2048)).toBe('2.0 KB/s')
  })

  it('formats eta', () => {
    expect(formatEta(null)).toBe('—')
    expect(formatEta(45)).toBe('45s')
    expect(formatEta(125)).toBe('2m 5s')
  })

  it('tracks speed over time', () => {
    const tracker = new SpeedTracker()
    expect(tracker.update(0, 1000)).toBe(0)
    const speed = tracker.update(1024, 2000)
    expect(speed).toBeCloseTo(1024, 0)
  })

  it('builds progress with eta', () => {
    const progress = createProgress(512, 1024, 256)
    expect(progress.etaSeconds).toBe(2)
    expect(progress.totalBytes).toBe(1024)
  })
})

describe('transfer-protocol', () => {
  it('round-trips meta messages', () => {
    const raw = encodeMetaMessage({
      type: 'meta',
      name: 'photo.png',
      size: 4096,
      mime: 'image/png',
    })
    expect(decodeControlMessage(raw)).toEqual({
      type: 'meta',
      name: 'photo.png',
      size: 4096,
      mime: 'image/png',
    })
  })

  it('decodes done messages', () => {
    expect(decodeControlMessage(encodeDoneMessage())).toEqual({ type: 'done' })
  })
})
