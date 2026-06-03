import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getZoom } from './zoom.ts'

describe('getZoom', () => {
  let styleZoom = ''

  beforeEach(() => {
    styleZoom = ''
    vi.stubGlobal('document', {
      documentElement: {
        style: {
          get zoom() {
            return styleZoom
          },
          set zoom(v: string) {
            styleZoom = v
          },
        },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns 1 when zoom is not set', () => {
    styleZoom = ''
    expect(getZoom()).toBe(1)
  })

  it('parses percentage zoom', () => {
    styleZoom = '150%'
    expect(getZoom()).toBeCloseTo(1.5)
  })

  it('parses numeric zoom string', () => {
    styleZoom = '0.75'
    expect(getZoom()).toBeCloseTo(0.75)
  })

  it('returns 1 for invalid zoom string', () => {
    styleZoom = 'invalid'
    expect(getZoom()).toBe(1)
  })

  it('parses 100% as 1', () => {
    styleZoom = '100%'
    expect(getZoom()).toBeCloseTo(1)
  })
})
