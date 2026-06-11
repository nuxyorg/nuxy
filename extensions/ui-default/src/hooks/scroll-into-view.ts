// fallow-ignore-file code-duplication
let scrollAnimationId: number | null = null
let currentTargetTop: number | null = null
let currentContainer: HTMLElement | null = null

function smoothScrollTo(container: HTMLElement, target: number) {
  currentTargetTop = target
  currentContainer = container

  if (scrollAnimationId === null) {
    const animate = () => {
      if (!currentContainer || currentTargetTop === null) {
        scrollAnimationId = null
        return
      }

      const diff = currentTargetTop - currentContainer.scrollTop
      if (Math.abs(diff) < 1) {
        currentContainer.scrollTop = currentTargetTop
        scrollAnimationId = null
        return
      }

      currentContainer.scrollTop += diff * 0.3
      scrollAnimationId = requestAnimationFrame(animate)
    }

    scrollAnimationId = requestAnimationFrame(animate)
  }
}

function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  if (!node || node === document.body) return null
  const style = window.getComputedStyle(node)
  if (/(auto|scroll|overlay)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
    return node
  }
  return getScrollParent(node.parentElement)
}

export function smoothScrollIntoViewIfNeeded(el: HTMLElement) {
  const parent = getScrollParent(el.parentElement)

  if (!parent) {
    el.scrollIntoView({ block: 'nearest' })
    return
  }

  const elRect = el.getBoundingClientRect()
  const parentRect = parent.getBoundingClientRect()

  let targetScrollTop =
    currentContainer === parent && scrollAnimationId !== null && currentTargetTop !== null
      ? currentTargetTop
      : parent.scrollTop

  let futureElTop = elRect.top + (parent.scrollTop - targetScrollTop)
  const futureElBottom = futureElTop + elRect.height

  if (futureElBottom > parentRect.bottom) {
    targetScrollTop += futureElBottom - parentRect.bottom
  } else if (futureElTop < parentRect.top) {
    targetScrollTop -= parentRect.top - futureElTop
  }

  targetScrollTop = Math.max(
    0,
    Math.min(targetScrollTop, parent.scrollHeight - parent.clientHeight)
  )

  if (targetScrollTop !== parent.scrollTop || scrollAnimationId !== null) {
    smoothScrollTo(parent, targetScrollTop)
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
export function smoothScrollElementToStart(el: HTMLElement, instant = false): void {
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
    smoothScrollTo(parent, targetScrollTop)
  }
}

/** Scroll a list's active item into view after layout settles. */
export function scrollListActiveItem(listEl: HTMLElement, activeIndex: number): void {
  requestAnimationFrame(() => {
    let target: HTMLElement | null = null
    if (activeIndex === 0) {
      const prev = listEl.previousElementSibling as HTMLElement | null
      target =
        prev?.tagName.toLowerCase() === 'nuxy-section-header'
          ? prev
          : (listEl.querySelector('nuxy-list-item') as HTMLElement | null)
    } else if (activeIndex > 0) {
      const items = listEl.querySelectorAll('nuxy-list-item')
      target = (items[activeIndex] as HTMLElement | undefined) ?? null
    } else {
      target = listEl.querySelector('nuxy-list-item[active]')
    }
    if (target) smoothScrollIntoViewIfNeeded(target)
  })
}
