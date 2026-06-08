/** Shared utilities for vanilla custom-element extensions (Lit migration path). */

export type Unsubscribe = () => void

export interface Store<T extends object> {
  getState: () => T
  setState: (partial: Partial<T> | ((prev: T) => Partial<T>)) => void
  subscribe: (listener: () => void) => Unsubscribe
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<() => void>()

  return {
    getState: () => state,
    setState(partial) {
      const patch = typeof partial === 'function' ? partial(state) : partial
      state = { ...state, ...patch }
      listeners.forEach((l) => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

type Child = Node | string | null | undefined | false

function setProp(el: HTMLElement, key: string, value: unknown): void {
  if (key === 'className' || key === 'class') {
    if (value != null) el.className = String(value)
    return
  }
  if (key === 'style' && value && typeof value === 'object') {
    Object.assign(el.style, value)
    return
  }
  if (key === 'ref') {
    if (typeof value === 'function') {
      queueMicrotask(() => (value as (el: HTMLElement) => void)(el))
      return
    }
    if (typeof value === 'object' && value !== null && 'current' in value) {
      ;(value as { current: HTMLElement | null }).current = el
      return
    }
  }
  if (key.startsWith('on') && typeof value === 'function') {
    const event = key.slice(2).toLowerCase()
    el.addEventListener(event, value as EventListener)
    return
  }
  if (value === false || value == null) return
  if (value === true || value === '') {
    el.setAttribute(key, '')
    return
  }
  if (key in el && typeof value !== 'object') {
    ;(el as unknown as Record<string, unknown>)[key] = value
    return
  }
  el.setAttribute(key, String(value))
}

/** Minimal DOM factory — replaces React.createElement for CE composition. */
export function h(
  tag: string,
  props?: Record<string, unknown> | null,
  ...children: Child[]
): HTMLElement {
  const el = document.createElement(tag)
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      setProp(el, key, value)
    }
  }
  for (const child of children) {
    if (child == null || child === false) continue
    if (typeof child === 'string' || typeof child === 'number') {
      el.append(document.createTextNode(String(child)))
    } else {
      el.append(child as Node)
    }
  }
  return el
}

export function clear(el: Element): void {
  el.replaceChildren()
}

/**
 * Apply base classes on a custom-element host without class ↔ sync infinite loops.
 * Preserves user-provided classes that are not in the base set.
 */
export function syncHostClasses(el: HTMLElement, ...classes: string[]): void {
  const bases = classes.filter(Boolean)
  const baseSet = new Set(bases)
  const extras = el.className.split(/\s+/).filter((c) => c && !baseSet.has(c))
  const next = [...bases, ...extras].join(' ')
  if (el.className !== next) el.className = next
}
