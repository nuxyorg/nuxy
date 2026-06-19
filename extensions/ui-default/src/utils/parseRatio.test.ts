import { describe, it, expect } from 'vitest'
import { parseRatio, clampSplitRatio, isSplitLocked } from './parseRatio.ts'

describe('parseRatio', () => {
  it('parses fractions', () => {
    expect(parseRatio('1/4')).toBe(0.25)
    expect(parseRatio('3/4')).toBe(0.75)
    expect(parseRatio('1/2')).toBe(0.5)
  })

  it('parses percentages', () => {
    expect(parseRatio('25%')).toBe(0.25)
    expect(parseRatio('50%')).toBe(0.5)
  })

  it('parses decimal ratios', () => {
    expect(parseRatio('0.1')).toBe(0.1)
    expect(parseRatio('0.5')).toBe(0.5)
  })

  it('clamps out-of-range values', () => {
    expect(parseRatio('1.5')).toBe(1)
    expect(parseRatio('-0.2')).toBe(0)
  })

  it('returns fallback for invalid input', () => {
    expect(parseRatio('', 0.3)).toBe(0.3)
    expect(parseRatio('abc', 0.3)).toBe(0.3)
  })
})

describe('clampSplitRatio', () => {
  it('clamps between minScale and 1 - minScale for 1/4', () => {
    expect(clampSplitRatio(0.1, 0.25)).toBe(0.25)
    expect(clampSplitRatio(0.5, 0.25)).toBe(0.5)
    expect(clampSplitRatio(0.9, 0.25)).toBe(0.75)
  })

  it('clamps between 1/10 and 9/10', () => {
    expect(clampSplitRatio(0.05, 0.1)).toBe(0.1)
    expect(clampSplitRatio(0.95, 0.1)).toBe(0.9)
  })

  it('locks at 1/2 when minScale is 1/2', () => {
    expect(clampSplitRatio(0.25, 0.5)).toBe(0.5)
    expect(clampSplitRatio(0.75, 0.5)).toBe(0.5)
  })
})

describe('isSplitLocked', () => {
  it('is locked at minScale 1/2', () => {
    expect(isSplitLocked(0.5)).toBe(true)
    expect(isSplitLocked(parseRatio('1/2'))).toBe(true)
  })

  it('is resizable below 1/2', () => {
    expect(isSplitLocked(0.25)).toBe(false)
    expect(isSplitLocked(0.1)).toBe(false)
  })
})
