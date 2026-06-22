import { describe, it, expect } from 'vitest'
import { isNearBottom, NEAR_BOTTOM_THRESHOLD_PX } from '../utils/chat-scroll.ts'

describe('isNearBottom', () => {
  it('is true when scrolled exactly to the bottom', () => {
    expect(isNearBottom({ scrollTop: 200, scrollHeight: 300, clientHeight: 100 })).toBe(true)
  })

  it('is true when within the default threshold of the bottom', () => {
    expect(
      isNearBottom({
        scrollTop: 200 - NEAR_BOTTOM_THRESHOLD_PX,
        scrollHeight: 300,
        clientHeight: 100,
      })
    ).toBe(true)
  })

  it('is false once scrolled further up than the default threshold', () => {
    expect(
      isNearBottom({
        scrollTop: 200 - NEAR_BOTTOM_THRESHOLD_PX - 1,
        scrollHeight: 300,
        clientHeight: 100,
      })
    ).toBe(false)
  })

  it('respects a custom threshold', () => {
    expect(isNearBottom({ scrollTop: 180, scrollHeight: 300, clientHeight: 100 }, 5)).toBe(false)
    expect(isNearBottom({ scrollTop: 196, scrollHeight: 300, clientHeight: 100 }, 5)).toBe(true)
  })

  it('is true when content does not overflow the viewport', () => {
    expect(isNearBottom({ scrollTop: 0, scrollHeight: 100, clientHeight: 100 })).toBe(true)
  })
})
