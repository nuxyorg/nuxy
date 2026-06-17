export type ListIndicatorState = {
  wasHidden: boolean
}

export type ListIndicatorStyle = {
  transform: string
  height: string
  visible: boolean
}

export function createListIndicatorState(): ListIndicatorState {
  return { wasHidden: true }
}

export function computeListIndicatorPosition(
  target: HTMLElement
): Pick<ListIndicatorStyle, 'transform' | 'height'> {
  return {
    transform: `translateY(${target.offsetTop}px)`,
    height: `${target.offsetHeight}px`,
  }
}

export function listIndicatorStyleForTarget(target: HTMLElement | null): ListIndicatorStyle {
  if (!target) {
    return { transform: '', height: '', visible: false }
  }
  const { transform, height } = computeListIndicatorPosition(target)
  return { transform, height, visible: true }
}

export function resolveActiveItem(
  container: ParentNode,
  activeIndex: number | null | undefined,
  itemSelector: string
): HTMLElement | null {
  if (activeIndex === null || activeIndex === undefined || isNaN(activeIndex) || activeIndex < 0) {
    return null
  }
  const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector))
  return items[activeIndex] ?? null
}

export function findListIndicatorElement(
  host: { shadowRoot: ShadowRoot | null },
  selector = '.indicator'
): HTMLElement | null {
  return host.shadowRoot?.querySelector<HTMLElement>(selector) ?? null
}

export function resetListIndicatorElement(indicator: HTMLElement): void {
  indicator.style.transition = 'none'
  indicator.style.transform = 'translateY(0px)'
  indicator.style.height = '0px'
  void indicator.offsetHeight
  indicator.style.transition = ''
}

/**
 * Imperatively position a list indicator element (shadow-DOM `.indicator` bar).
 * Handles the snap-on-first-show transition so CSS animations do not run from 0.
 */
export function updateListIndicatorElement(
  indicator: HTMLElement,
  target: HTMLElement | null,
  state: ListIndicatorState,
  options: { visibleClass?: string } = {}
): ListIndicatorState {
  const visibleClass = options.visibleClass ?? 'visible'

  if (!target) {
    indicator.classList.remove(visibleClass)
    resetListIndicatorElement(indicator)
    return { wasHidden: true }
  }

  const snap = state.wasHidden
  if (snap) {
    indicator.style.transition = 'none'
  }

  const { transform, height } = computeListIndicatorPosition(target)
  indicator.style.transform = transform
  indicator.style.height = height
  indicator.classList.add(visibleClass)

  if (snap) {
    void indicator.offsetHeight
    indicator.style.transition = ''
  }

  return { wasHidden: false }
}
