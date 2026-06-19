import { describe, it, expect } from 'vitest'
import { formatBytes, formatSpeed } from '../utils/format.ts'

describe('formatBytes', () => {
  it('formats zero', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(2048)).toBe('2.0 KB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})

describe('formatSpeed', () => {
  it('formats zero speed', () => {
    expect(formatSpeed(0)).toBe('0 B/s')
  })

  it('formats a positive speed with /s suffix', () => {
    expect(formatSpeed(1024)).toBe('1.0 KB/s')
  })
})
