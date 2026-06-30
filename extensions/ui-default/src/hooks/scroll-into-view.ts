// fallow-ignore-file code-duplication
import { resolveActiveItem } from './list-indicator'

const DEFAULT_SCROLL_SPEED = 0.2

let scrollAnimationId: number | null = null
let currentTargetTop: number | null = null
let currentContainer: HTMLElement | null = null
let currentScrollSpeed = DEFAULT_SCROLL_SPEED
let lastFrameTime: number | null = null
/** Last scrollTop this module wrote — lets the loop spot a manual scroll and bail. */
let lastWrittenTop: number | null = null

/** Abandon an in-flight animation once the user scrolls more than this past our write. */
const MANUAL_SCROLL_CANCEL_PX = 1.5

function resolveScrollSpeed(override?: number): number {
  if (override !== undefined && Number.isFinite(override) && override > 0) {
    return Math.min(1, override)
  }
  return DEFAULT_SCROLL_SPEED
}

/** @internal Exported for unit tests. */
export const resolveScrollSpeedForTest = resolveScrollSpeed
export { DEFAULT_SCROLL_SPEED }

function stopScrollAnimation(): void {
  scrollAnimationId = null
  currentTargetTop = null
  currentContainer = null
  lastFrameTime = null
  lastWrittenTop = null
}

function smoothScrollTo(container: HTMLElement, target: number, speed?: number) {
  currentTargetTop = target
  currentContainer = container
  currentScrollSpeed = resolveScrollSpeed(speed)

  if (scrollAnimationId === null) {
    lastWrittenTop = container.scrollTop
    const animate = (timestamp: number) => {
      if (!currentContainer || currentTargetTop === null) {
        stopScrollAnimation()
        return
      }

      // The user spun the wheel / grabbed the scrollbar mid-animation — the
      // container moved somewhere we didn't put it, so hand control back.
      if (
        lastWrittenTop !== null &&
        Math.abs(currentContainer.scrollTop - lastWrittenTop) > MANUAL_SCROLL_CANCEL_PX
      ) {
        stopScrollAnimation()
        return
      }

      const rawDt = lastFrameTime !== null ? timestamp - lastFrameTime : 0
      const dt = rawDt > 0 ? Math.min(rawDt, 100) : 1000 / 60
      lastFrameTime = timestamp

      const diff = currentTargetTop - currentContainer.scrollTop
      if (Math.abs(diff) < 1) {
        currentContainer.scrollTop = currentTargetTop
        stopScrollAnimation()
        return
      }

      const factor = 1 - Math.pow(1 - currentScrollSpeed, (dt * 60) / 1000)
      currentContainer.scrollTop += diff * factor
      lastWrittenTop = currentContainer.scrollTop
      scrollAnimationId = requestAnimationFrame(animate)
    }

    scrollAnimationId = requestAnimationFrame(animate)
  }
}

function ascendDomTree(node: HTMLElement): HTMLElement | null {
  if (node.parentElement) return node.parentElement
  const root = node.getRootNode()
  if (root instanceof ShadowRoot && root.host instanceof HTMLElement) {
    return root.host
  }
  return null
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
    current = ascendDomTree(current)
  }

  return overflowFallback
}

function maxScrollTop(container: HTMLElement): number {
  return Math.max(0, container.scrollHeight - container.clientHeight)
}

export type ScrollBias = 'up' | 'down'

export interface SmoothScrollIntoViewOptions {
  /** Inflate the element rect in the navigation direction so context stays visible ahead. */
  scrollBias?: ScrollBias
  /** When false, scroll only enough to keep the focused item visible (no extra margin). Default true. */
  scrollLookahead?: boolean
  /** Override look-ahead padding in px; default is the focused element's own height (~one item). */
  scrollLookaheadPadding?: number
  /** Fraction of remaining distance applied per frame (0–1). Default 0.2. */
  scrollSpeed?: number
}

export interface ScrollListActiveItemOptions {
  /** When false, scroll only enough to keep the focused item visible (no extra margin). Default true. */
  scrollLookahead?: boolean
  scrollLookaheadPadding?: number
  scrollSpeed?: number
  /** Defaults to `nuxy-list-item`. Grids pass `nuxy-grid-item`. */
  itemSelector?: string
  /** Map the matched item to the element whose rect drives scrolling. */
  resolveTarget?: (item: HTMLElement | null) => HTMLElement | null
}

type RectLike = Pick<DOMRect, 'top' | 'bottom' | 'height'>

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

/** Default look-ahead is one item — approximated by the focused element's height. */
function resolveScrollLookaheadPadding(
  elRect: RectLike,
  override?: number,
  enabled = true
): number {
  if (!enabled) return 0
  if (override !== undefined && Number.isFinite(override) && override >= 0) {
    return override
  }
  return elRect.height
}

/**
 * Computes the desired scrollTop for `elRect`, without clamping to [0, maxScrollTop].
 * With a `scrollBias`, only scrolls in the navigation direction so the view never
 * jumps backwards relative to the keypress.
 */
function computeRawScrollTarget(
  elRect: RectLike,
  parent: HTMLElement,
  parentRect: DOMRect,
  startScrollTop: number,
  scrollBias?: ScrollBias
): number {
  let targetScrollTop = startScrollTop

  const futureElTop = elRect.top + (parent.scrollTop - targetScrollTop)
  const futureElBottom = futureElTop + elRect.height

  if (futureElBottom > parentRect.bottom && scrollBias !== 'up') {
    targetScrollTop += futureElBottom - parentRect.bottom
  } else if (futureElTop < parentRect.top && scrollBias !== 'down') {
    targetScrollTop -= parentRect.top - futureElTop
  }

  return targetScrollTop
}

function computeScrollTargetForRect(
  elRect: RectLike,
  parent: HTMLElement,
  parentRect: DOMRect,
  startScrollTop: number
): number {
  const raw = computeRawScrollTarget(elRect, parent, parentRect, startScrollTop)
  return clamp(raw, 0, maxScrollTop(parent))
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
  const parent = getScrollParent(el)
  const max = parent ? maxScrollTop(parent) : 0

  if (!parent || max <= 0) {
    el.scrollIntoView({ block: 'nearest' })
    return
  }

  const elRect = el.getBoundingClientRect()
  const parentRect = parent.getBoundingClientRect()

  // While a programmatic scroll is mid-flight, chain off its destination so
  // back-to-back calls compose smoothly. Directional (bias) nav always measures
  // from the live position, so a reversed keypress turns around immediately.
  const startScrollTop = options.scrollBias
    ? parent.scrollTop
    : currentContainer === parent && scrollAnimationId !== null && currentTargetTop !== null
      ? currentTargetTop
      : parent.scrollTop

  let targetScrollTop: number

  if (options.scrollBias) {
    // "Minimal + margin": only scroll once the focused item plus one item of
    // look-ahead would leave the viewport; otherwise the cursor moves freely.
    const padding = resolveScrollLookaheadPadding(
      elRect,
      options.scrollLookaheadPadding,
      options.scrollLookahead !== false
    )
    const biasedRect = inflateRectForScrollBias(elRect, options.scrollBias, padding)
    const raw = computeRawScrollTarget(
      biasedRect,
      parent,
      parentRect,
      startScrollTop,
      options.scrollBias
    )
    // Hard-clamp to the scrollable range: when the look-ahead reaches past an
    // edge the target caps flush at 0 / max, so navigation lands exactly on the
    // boundary instead of stopping short or overshooting.
    targetScrollTop = clamp(raw, 0, max)
  } else {
    targetScrollTop = computeScrollTargetForRect(elRect, parent, parentRect, startScrollTop)
  }

  const scrollNeeded = targetScrollTop !== parent.scrollTop

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
  const parent = getScrollParent(el)

  if (!parent) {
    el.scrollIntoView({ block: 'start' })
    return
  }

  const targetScrollTop = scrollTopForElementStart(el, parent)

  if (instant) {
    if (currentContainer === parent) stopScrollAnimation()
    parent.scrollTop = targetScrollTop
    return
  }

  if (targetScrollTop !== parent.scrollTop || scrollAnimationId !== null) {
    smoothScrollTo(parent, targetScrollTop, scrollSpeed)
  }
}

function findSectionHeaderAbove(el: HTMLElement): HTMLElement | null {
  let prev = el.previousElementSibling as HTMLElement | null
  while (prev) {
    if (prev.tagName.toLowerCase() === 'nuxy-section-header') return prev
    const nested = prev.querySelector('nuxy-section-header')
    if (nested instanceof HTMLElement) return nested
    prev = prev.previousElementSibling as HTMLElement | null
  }
  return null
}

function resolveNavActiveTarget(
  containerEl: HTMLElement,
  activeIndex: number,
  previousActiveIndex: number | undefined,
  itemSelector: string,
  resolveTarget: (item: HTMLElement | null) => HTMLElement | null
): HTMLElement | null {
  if (activeIndex >= 0) {
    const item = resolveActiveItem(containerEl, activeIndex, itemSelector)
    const scrollingUp = previousActiveIndex !== undefined && previousActiveIndex > activeIndex
    if (activeIndex === 0 && scrollingUp) {
      const header = findSectionHeaderAbove(containerEl)
      if (header) return header
    }
    return resolveTarget(item)
  }
  if (itemSelector === 'nuxy-list-item') {
    return containerEl.querySelector('nuxy-list-item[active]')
  }
  return null
}

function resolveListActiveTarget(
  listEl: HTMLElement,
  activeIndex: number,
  previousActiveIndex?: number
): HTMLElement | null {
  return resolveNavActiveTarget(
    listEl,
    activeIndex,
    previousActiveIndex,
    'nuxy-list-item',
    (item) => item
  )
}

/** @internal Exported for unit tests. */
export const _resolveListActiveTargetForTest = resolveListActiveTarget

/** @internal Resets in-flight scroll animation between unit tests. */
export function resetSmoothScrollStateForTest(): void {
  stopScrollAnimation()
  currentScrollSpeed = DEFAULT_SCROLL_SPEED
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

/** Scroll the active navigable item into view after layout settles (list, grid, …). */
export function scrollListActiveItem(
  containerEl: HTMLElement,
  activeIndex: number,
  previousActiveIndex?: number,
  options: ScrollListActiveItemOptions = {}
): void {
  const scrollBias = scrollBiasForIndexChange(activeIndex, previousActiveIndex)
  const itemSelector = options.itemSelector ?? 'nuxy-list-item'
  const resolveTarget = options.resolveTarget ?? ((item) => item)

  // Focus left the list at the top (e.g. ArrowUp off the first item, back to the
  // search box) — settle the scroll container flush at the very top.
  if (activeIndex < 0 && scrollBias === 'up') {
    requestAnimationFrame(() => {
      const parent = getScrollParent(containerEl)
      if (parent && parent.scrollTop > 0) {
        smoothScrollTo(parent, 0, options.scrollSpeed)
      }
    })
    return
  }

  const attempt = (retriesLeft: number) => {
    requestAnimationFrame(() => {
      const target = resolveNavActiveTarget(
        containerEl,
        activeIndex,
        previousActiveIndex,
        itemSelector,
        resolveTarget
      )
      if (!target) return

      const parent = getScrollParent(target)
      const parentMax = parent ? maxScrollTop(parent) : 0
      if (parent && parentMax <= 0 && retriesLeft > 0) {
        attempt(retriesLeft - 1)
        return
      }

      smoothScrollIntoViewIfNeeded(target, {
        scrollBias,
        scrollLookahead: options.scrollLookahead,
        scrollLookaheadPadding: options.scrollLookaheadPadding,
        scrollSpeed: options.scrollSpeed,
      })
    })
  }

  attempt(2)
}
