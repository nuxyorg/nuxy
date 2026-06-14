// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  smoothScrollIntoViewIfNeeded,
  resetSmoothScrollStateForTest,
  resolveScrollSpeedForTest,
  DEFAULT_SCROLL_SPEED,
  _resolveListActiveTargetForTest,
} from './scroll-into-view.ts'

function setupScrollContainer() {
  const container = document.createElement('div')
  container.style.overflowY = 'auto'
  container.style.height = '100px'

  const item = document.createElement('div')
  item.textContent = 'item'
  item.style.height = '20px'
  container.appendChild(item)
  document.body.appendChild(container)

  Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 200 })
  Object.defineProperty(container, 'clientHeight', { configurable: true, value: 100 })

  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
    top: 0,
    bottom: 100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
  vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
    top: 120,
    bottom: 140,
    left: 0,
    right: 100,
    width: 100,
    height: 20,
    x: 0,
    y: 120,
    toJSON: () => ({}),
  } as DOMRect)

  return { container, item }
}

describe('scroll-into-view', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
  })

  afterEach(() => {
    resetSmoothScrollStateForTest()
    vi.restoreAllMocks()
  })

  it('prefers a scrollable overflow container over native scrollIntoView', () => {
    const { container, item } = setupScrollContainer()

    const scrollIntoView = vi.spyOn(item, 'scrollIntoView')

    smoothScrollIntoViewIfNeeded(item)

    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(container.scrollTop).toBeGreaterThan(0)
  })

  it('scrolls to section header when moving up to the first list item', () => {
    if (!customElements.get('nuxy-section-header')) {
      customElements.define('nuxy-section-header', class extends HTMLElement {})
    }
    if (!customElements.get('nuxy-list-item')) {
      customElements.define('nuxy-list-item', class extends HTMLElement {})
    }

    const header = document.createElement('nuxy-section-header')
    const list = document.createElement('div')
    const first = document.createElement('nuxy-list-item')
    const second = document.createElement('nuxy-list-item')
    list.append(first, second)
    document.body.append(header, list)

    expect(_resolveListActiveTargetForTest(list, 0, 1)).toBe(header)
    expect(_resolveListActiveTargetForTest(list, 0, -1)).toBe(first)
    expect(_resolveListActiveTargetForTest(list, 0, 0)).toBe(first)
    expect(_resolveListActiveTargetForTest(list, 1, 0)).toBe(second)
  })

  it('does not scroll when the item is already fully visible, even with scrollBias', () => {
    const { container, item } = setupScrollContainer()

    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
      top: 50,
      bottom: 90,
      left: 0,
      right: 100,
      width: 100,
      height: 40,
      x: 0,
      y: 50,
      toJSON: () => ({}),
    } as DOMRect)

    smoothScrollIntoViewIfNeeded(item, { scrollBias: 'down' })
    expect(container.scrollTop).toBe(0)
  })

  it('scrolls further when scrollBias is down and the item is off-screen', () => {
    const { container, item } = setupScrollContainer()

    smoothScrollIntoViewIfNeeded(item)
    const neutral = container.scrollTop

    resetSmoothScrollStateForTest()
    container.scrollTop = 0

    smoothScrollIntoViewIfNeeded(item, { scrollBias: 'down' })
    expect(container.scrollTop).toBeGreaterThan(neutral)
  })

  it('uses scrollLookaheadPadding override instead of container height / 5', () => {
    const { container, item } = setupScrollContainer()

    smoothScrollIntoViewIfNeeded(item, { scrollBias: 'down' })
    const defaultPaddingScroll = container.scrollTop

    resetSmoothScrollStateForTest()
    container.scrollTop = 0

    smoothScrollIntoViewIfNeeded(item, { scrollBias: 'down', scrollLookaheadPadding: 80 })
    expect(container.scrollTop).toBeGreaterThan(defaultPaddingScroll)
  })

  it('resolves scrollSpeed override with clamping', () => {
    expect(resolveScrollSpeedForTest()).toBe(DEFAULT_SCROLL_SPEED)
    expect(resolveScrollSpeedForTest(0.25)).toBe(0.25)
    expect(resolveScrollSpeedForTest(2)).toBe(1)
  })
})
