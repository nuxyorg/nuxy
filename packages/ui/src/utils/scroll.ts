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
  if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
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

  // If this is the first item in its list container, check if a section header precedes the container
  if (el.parentElement && !el.previousElementSibling) {
    const listSibling = el.parentElement.previousElementSibling as HTMLElement
    if (listSibling && listSibling.classList.contains('nuxy-section-header')) {
      const headerHeight = listSibling.getBoundingClientRect().height
      futureElTop -= headerHeight
    }
  }

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
