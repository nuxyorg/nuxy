// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  smoothScrollIntoViewIfNeeded,
  scrollListActiveItem,
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

  it('finds scroll parent through shadow DOM hosts', () => {
    const container = document.createElement('div')
    container.style.overflowY = 'auto'
    container.style.height = '100px'

    const host = document.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })
    const button = document.createElement('button')
    shadow.appendChild(button)
    container.appendChild(host)
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
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
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

    const scrollIntoView = vi.spyOn(button, 'scrollIntoView')
    smoothScrollIntoViewIfNeeded(button)

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

  it('applies a one-item (element-height) down-bias lookahead when already fully visible', () => {
    const { container, item } = setupScrollContainer()

    // Item is fully visible (50–90 in a 0–100 viewport), but the default
    // look-ahead is one item = the element's own height (40). The inflated
    // bottom (90 + 40 = 130) overruns the viewport by 30, so it scrolls 30.
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
    expect(container.scrollTop).toBe(30)
  })

  it('skips look-ahead padding when scrollLookahead is false', () => {
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

    smoothScrollIntoViewIfNeeded(item, { scrollBias: 'down', scrollLookahead: false })
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

  it('uses scrollLookaheadPadding override instead of the default one-item look-ahead', () => {
    const { container, item } = setupScrollContainer()

    smoothScrollIntoViewIfNeeded(item, { scrollBias: 'down' })
    const defaultPaddingScroll = container.scrollTop

    resetSmoothScrollStateForTest()
    container.scrollTop = 0

    smoothScrollIntoViewIfNeeded(item, { scrollBias: 'down', scrollLookaheadPadding: 80 })
    expect(container.scrollTop).toBeGreaterThan(defaultPaddingScroll)
  })

  it('snaps to scrollTop 0 when up-bias look-ahead clamps at the top edge', () => {
    const { container, item } = setupScrollContainer()
    container.scrollTop = 8

    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
      top: 8,
      bottom: 28,
      left: 0,
      right: 100,
      width: 100,
      height: 20,
      x: 0,
      y: 8,
      toJSON: () => ({}),
    } as DOMRect)

    smoothScrollIntoViewIfNeeded(item, { scrollBias: 'up' })
    expect(container.scrollTop).toBe(0)
  })

  it('does not scroll up-bias when the look-ahead target stays within bounds', () => {
    const { container, item } = setupScrollContainer()
    container.scrollTop = 30

    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
      top: 30,
      bottom: 50,
      left: 0,
      right: 100,
      width: 100,
      height: 20,
      x: 0,
      y: 30,
      toJSON: () => ({}),
    } as DOMRect)

    smoothScrollIntoViewIfNeeded(item, { scrollBias: 'up' })
    expect(container.scrollTop).toBe(30)
  })

  it('snaps to maxScrollTop when down-bias look-ahead clamps at the bottom edge', () => {
    const { container, item } = setupScrollContainer()
    const maxTop = 100
    container.scrollTop = maxTop - 8

    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
      top: 72,
      bottom: 92,
      left: 0,
      right: 100,
      width: 100,
      height: 20,
      x: 0,
      y: 72,
      toJSON: () => ({}),
    } as DOMRect)

    smoothScrollIntoViewIfNeeded(item, { scrollBias: 'down' })
    expect(container.scrollTop).toBe(maxTop)
  })

  it('does not scroll down on up-bias when the item sits near the bottom edge', () => {
    const { container, item } = setupScrollContainer()
    const maxTop = 100
    container.scrollTop = maxTop - 8

    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
      top: 72,
      bottom: 92,
      left: 0,
      right: 100,
      width: 100,
      height: 20,
      x: 0,
      y: 72,
      toJSON: () => ({}),
    } as DOMRect)

    smoothScrollIntoViewIfNeeded(item, { scrollBias: 'up' })
    expect(container.scrollTop).toBeLessThan(maxTop)
  })

  it('keeps the look-ahead margin and does not jump to the top early', () => {
    const { container, item } = setupScrollContainer()
    container.scrollTop = 25

    // Up-bias look-ahead target is 25 - (20 - 10) = 15: still well inside the
    // range, so it scrolls only enough to keep one item of margin above — it
    // must NOT snap all the way to 0 while there is still content above.
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
      top: 10,
      bottom: 30,
      left: 0,
      right: 100,
      width: 100,
      height: 20,
      x: 0,
      y: 10,
      toJSON: () => ({}),
    } as DOMRect)

    smoothScrollIntoViewIfNeeded(item, { scrollBias: 'up' })
    expect(container.scrollTop).toBe(15)
  })

  it('keeps the look-ahead margin and does not jump to the bottom early', () => {
    const { container, item } = setupScrollContainer()
    container.scrollTop = 70

    // Down-bias look-ahead target is 70 + (115 - 100) = 85: below maxTop (100),
    // so it keeps one item of margin below rather than snapping to the bottom.
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
      top: 75,
      bottom: 95,
      left: 0,
      right: 100,
      width: 100,
      height: 20,
      x: 0,
      y: 75,
      toJSON: () => ({}),
    } as DOMRect)

    smoothScrollIntoViewIfNeeded(item, { scrollBias: 'down' })
    expect(container.scrollTop).toBe(85)
  })

  it('settles the list at the very top when focus leaves it upward (deselect)', () => {
    const container = document.createElement('div')
    container.style.overflowY = 'auto'
    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 200 })
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 100 })

    const list = document.createElement('div')
    container.appendChild(list)
    document.body.appendChild(container)
    container.scrollTop = 50

    // activeIndex -1 (focus moved back to the search box) coming from index 0.
    scrollListActiveItem(list, -1, 0)
    expect(container.scrollTop).toBe(0)
  })

  it('resolves scrollSpeed override with clamping', () => {
    expect(resolveScrollSpeedForTest()).toBe(DEFAULT_SCROLL_SPEED)
    expect(resolveScrollSpeedForTest(0.25)).toBe(0.25)
    expect(resolveScrollSpeedForTest(2)).toBe(1)
  })
})
