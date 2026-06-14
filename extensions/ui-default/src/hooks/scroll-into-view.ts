// fallow-ignore-file code-duplication
const DEFAULT_SCROLL_SPEED = 0.1

let scrollAnimationId: number | null = null
let currentTargetTop: number | null = null
let currentContainer: HTMLElement | null = null
let currentScrollSpeed = DEFAULT_SCROLL_SPEED
let lastFrameTime: number | null = null

function resolveScrollSpeed(override?: number): number {
  if (override !== undefined && Number.isFinite(override) && override > 0) {
    return Math.min(1, override)
  }
  return DEFAULT_SCROLL_SPEED
}

/** @internal Exported for unit tests. */
export const resolveScrollSpeedForTest = resolveScrollSpeed
export { DEFAULT_SCROLL_SPEED }

function smoothScrollTo(container: HTMLElement, target: number, speed?: number) {
  currentTargetTop = target
  currentContainer = container
  currentScrollSpeed = resolveScrollSpeed(speed)

  if (scrollAnimationId === null) {
    const animate = (timestamp: number) => {
      if (!currentContainer || currentTargetTop === null) {
        scrollAnimationId = null
        lastFrameTime = null
        return
      }

      const rawDt = lastFrameTime !== null ? timestamp - lastFrameTime : 0
      const dt = rawDt > 0 ? Math.min(rawDt, 100) : 1000 / 60
      lastFrameTime = timestamp

      const diff = currentTargetTop - currentContainer.scrollTop
      if (Math.abs(diff) < 1) {
        currentContainer.scrollTop = currentTargetTop
        scrollAnimationId = null
        lastFrameTime = null
        return
      }

      const factor = 1 - Math.pow(1 - currentScrollSpeed, (dt * 60) / 1000)
      currentContainer.scrollTop += diff * factor
      scrollAnimationId = requestAnimationFrame(animate)
    }

    scrollAnimationId = requestAnimationFrame(animate)
  }
}

function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  if (!node || node === document.body) return null

  let overflowFallback: HTMLElement | null = null
  let current: HTMLElement | null = node

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current)
    if (/(auto|scroll|overlay)/.test(style.overflowY)) {
      if (current.scrollHeight > current.clientHeight) return current
      overflowFallback ??= current
    }
    current = current.parentElement
  }

  return overflowFallback
}

function maxScrollTop(container: HTMLElement): number {
  return Math.max(0, container.scrollHeight - container.clientHeight)
}

function defaultScrollLookaheadPadding(container: HTMLElement): number {
  return Math.round(container.clientHeight / 5)
}

function resolveScrollLookaheadPadding(container: HTMLElement, override?: number): number {
  if (override !== undefined && Number.isFinite(override) && override >= 0) {
    return override
  }
  return defaultScrollLookaheadPadding(container)
}

export type ScrollBias = 'up' | 'down'

export interface SmoothScrollIntoViewOptions {
  /** Inflate the element rect in the navigation direction when scroll is already needed. */
  scrollBias?: ScrollBias
  /** Override lookahead padding in px; default is scroll container height / 5. */
  scrollLookaheadPadding?: number
  /** Fraction of remaining distance applied per frame (0–1). Default 0.1. */
  scrollSpeed?: number
}

export interface ScrollListActiveItemOptions {
  scrollLookaheadPadding?: number
  scrollSpeed?: number
}

type RectLike = Pick<DOMRect, 'top' | 'bottom' | 'height'>

function computeScrollTargetForRect(
  elRect: RectLike,
  parent: HTMLElement,
  parentRect: DOMRect,
  startScrollTop: number
): number {
  let targetScrollTop = startScrollTop

  const futureElTop = elRect.top + (parent.scrollTop - targetScrollTop)
  const futureElBottom = futureElTop + elRect.height

  if (futureElBottom > parentRect.bottom) {
    targetScrollTop += futureElBottom - parentRect.bottom
  } else if (futureElTop < parentRect.top) {
    targetScrollTop -= parentRect.top - futureElTop
  }

  return Math.max(0, Math.min(targetScrollTop, maxScrollTop(parent)))
}

/** @internal Exported for unit tests. */
export function inflateRectForScrollBias(
  rect: RectLike,
  bias: ScrollBias,
  padding: number
): RectLike {
  if (bias === 'down') {
    return {
      top: rect.top,
      bottom: rect.bottom + padding,
      height: rect.height + padding,
    }
  }

  return {
    top: rect.top - padding,
    bottom: rect.bottom,
    height: rect.height + padding,
  }
}

export function smoothScrollIntoViewIfNeeded(
  el: HTMLElement,
  options: SmoothScrollIntoViewOptions = {}
): void {
  const parent = getScrollParent(el.parentElement)

  if (!parent) {
    el.scrollIntoView({ block: 'nearest' })
    return
  }

  const elRect = el.getBoundingClientRect()
  const parentRect = parent.getBoundingClientRect()

  const startScrollTop =
    currentContainer === parent && scrollAnimationId !== null && currentTargetTop !== null
      ? currentTargetTop
      : parent.scrollTop

  let targetScrollTop = computeScrollTargetForRect(elRect, parent, parentRect, startScrollTop)

  const scrollNeeded = targetScrollTop !== parent.scrollTop

  if (scrollNeeded && options.scrollBias) {
    const padding = resolveScrollLookaheadPadding(parent, options.scrollLookaheadPadding)
    const biasedRect = inflateRectForScrollBias(elRect, options.scrollBias, padding)
    targetScrollTop = computeScrollTargetForRect(biasedRect, parent, parentRect, startScrollTop)
  }

  if (maxScrollTop(parent) <= 0) {
    el.scrollIntoView({ block: 'nearest' })
    return
  }

  if (scrollNeeded || scrollAnimationId !== null) {
    smoothScrollTo(parent, targetScrollTop, options.scrollSpeed)
  }
}

function getZoom(): number {
  const z = document.documentElement.style.zoom
  if (!z) return 1
  if (z.endsWith('%')) return parseFloat(z) / 100
  return parseFloat(z) || 1
}

function scrollTopForElementStart(el: HTMLElement, parent: HTMLElement): number {
  const zoom = getZoom()
  const elRect = el.getBoundingClientRect()
  const parentRect = parent.getBoundingClientRect()
  return Math.max(
    0,
    Math.min(
      (elRect.top - parentRect.top) / zoom + parent.scrollTop,
      parent.scrollHeight - parent.clientHeight
    )
  )
}

/** Scroll so the element's top edge aligns with the scroll container's top. */
export function smoothScrollElementToStart(
  el: HTMLElement,
  instant = false,
  scrollSpeed?: number
): void {
  const parent = getScrollParent(el.parentElement)

  if (!parent) {
    el.scrollIntoView({ block: 'start' })
    return
  }

  const targetScrollTop = scrollTopForElementStart(el, parent)

  if (instant) {
    if (currentContainer === parent) {
      scrollAnimationId = null
      currentTargetTop = null
      currentContainer = null
    }
    parent.scrollTop = targetScrollTop
    return
  }

  if (targetScrollTop !== parent.scrollTop || scrollAnimationId !== null) {
    smoothScrollTo(parent, targetScrollTop, scrollSpeed)
  }
}

function resolveListActiveTarget(
  listEl: HTMLElement,
  activeIndex: number,
  previousActiveIndex?: number
): HTMLElement | null {
  if (activeIndex >= 0) {
    const items = listEl.querySelectorAll('nuxy-list-item')
    const item = (items[activeIndex] as HTMLElement | undefined) ?? null

    const scrollingUp = previousActiveIndex !== undefined && previousActiveIndex > activeIndex

    if (activeIndex === 0 && scrollingUp) {
      const header = listEl.previousElementSibling as HTMLElement | null
      if (header?.tagName.toLowerCase() === 'nuxy-section-header') return header
    }

    return item
  }
  return listEl.querySelector('nuxy-list-item[active]')
}

/** @internal Exported for unit tests. */
export const _resolveListActiveTargetForTest = resolveListActiveTarget

/** @internal Resets in-flight scroll animation between unit tests. */
export function resetSmoothScrollStateForTest(): void {
  scrollAnimationId = null
  currentTargetTop = null
  currentContainer = null
  currentScrollSpeed = DEFAULT_SCROLL_SPEED
  lastFrameTime = null
}

function listScrollBias(activeIndex: number, previousActiveIndex?: number): ScrollBias | undefined {
  if (previousActiveIndex === undefined) return undefined
  if (previousActiveIndex < activeIndex) return 'down'
  if (previousActiveIndex > activeIndex) return 'up'
  return undefined
}

/** Directional scroll bias from a focus index change. */
export function scrollBiasForIndexChange(
  activeIndex: number,
  previousActiveIndex?: number
): ScrollBias | undefined {
  return listScrollBias(activeIndex, previousActiveIndex)
}

/** Scroll a list's active item into view after layout settles. */
export function scrollListActiveItem(
  listEl: HTMLElement,
  activeIndex: number,
  previousActiveIndex?: number,
  options: ScrollListActiveItemOptions = {}
): void {
  const scrollBias = scrollBiasForIndexChange(activeIndex, previousActiveIndex)

  const attempt = (retriesLeft: number) => {
    requestAnimationFrame(() => {
      const target = resolveListActiveTarget(listEl, activeIndex, previousActiveIndex)
      if (!target) return

      const parent = getScrollParent(target.parentElement)
      if (parent && maxScrollTop(parent) <= 0 && retriesLeft > 0) {
        attempt(retriesLeft - 1)
        return
      }

      smoothScrollIntoViewIfNeeded(target, {
        scrollBias,
        scrollLookaheadPadding: options.scrollLookaheadPadding,
        scrollSpeed: options.scrollSpeed,
      })
    })
  }

  attempt(2)
}
