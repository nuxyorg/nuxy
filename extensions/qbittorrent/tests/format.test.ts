import { describe, it, expect } from 'vitest'
import { formatBytes, formatEta, formatProgress, formatSpeed } from '../utils/format.ts'

describe('formatBytes', () => {
  it('returns 0 B for zero or negative values', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(-5)).toBe('0 B')
  })

  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(2048)).toBe('2.0 KB')
  })

  it('formats megabytes, gigabytes, and terabytes', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB')
    expect(formatBytes(2 * 1024 * 1024 * 1024 * 1024)).toBe('2.0 TB')
  })

  it('drops decimals once the value reaches 100+', () => {
    expect(formatBytes(150 * 1024)).toBe('150 KB')
  })
})

describe('formatSpeed', () => {
  it('returns 0 B/s for zero or negative speed', () => {
    expect(formatSpeed(0)).toBe('0 B/s')
  })

  it('appends /s to the formatted byte size', () => {
    expect(formatSpeed(1024)).toBe('1.0 KB/s')
  })
})

describe('formatEta', () => {
  it('returns an em dash for the infinite sentinel value', () => {
    expect(formatEta(8640000)).toBe('—')
  })

  it('returns an em dash for negative or non-finite values', () => {
    expect(formatEta(-1)).toBe('—')
    expect(formatEta(Number.NaN)).toBe('—')
    expect(formatEta(Number.POSITIVE_INFINITY)).toBe('—')
  })

  it('formats seconds', () => {
    expect(formatEta(45)).toBe('45s')
  })

  it('formats minutes', () => {
    expect(formatEta(125)).toBe('2m')
  })

  it('formats hours and minutes', () => {
    expect(formatEta(3 * 3600 + 5 * 60)).toBe('3h 5m')
  })

  it('formats days and hours', () => {
    expect(formatEta(2 * 86400 + 4 * 3600)).toBe('2d 4h')
  })
})

describe('formatProgress', () => {
  it('formats a 0-1 fraction as a rounded percentage', () => {
    expect(formatProgress(0)).toBe('0%')
    expect(formatProgress(0.5)).toBe('50%')
    expect(formatProgress(1)).toBe('100%')
    expect(formatProgress(0.999)).toBe('100%')
  })
})
