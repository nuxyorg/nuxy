import { describe, it, expect } from 'vitest'
import { HOLD_MS_BY_PRESET, resolveHoldMs } from '../hold-ms.ts'

describe('resolveHoldMs', () => {
  it('maps short and long presets to milliseconds', () => {
    expect(resolveHoldMs('short')).toBe(HOLD_MS_BY_PRESET.short)
    expect(resolveHoldMs('long')).toBe(HOLD_MS_BY_PRESET.long)
  })

  it('falls back to long duration for unknown presets', () => {
    expect(resolveHoldMs(undefined)).toBe(HOLD_MS_BY_PRESET.long)
    expect(resolveHoldMs('medium')).toBe(HOLD_MS_BY_PRESET.long)
  })
})
