import type { UiChild } from './types.ts'
import { h } from './h.ts'

export function host(
  tag: string,
  attrs: Record<string, unknown>,
  listeners?: Record<string, EventListener>,
  ...children: UiChild[]
): HTMLElement {
  const el = h(tag, attrs, ...children)
  if (listeners) {
    for (const [evt, fn] of Object.entries(listeners)) {
      el.addEventListener(evt, fn)
    }
  }
  return el
}

export function setRef<T>(ref: unknown, value: T | null): void {
  if (typeof ref === 'function') (ref as (v: T | null) => void)(value)
  else if (ref && typeof ref === 'object' && 'current' in ref) {
    ;(ref as { current: T | null }).current = value
  }
}

export function wireInputRef(hostEl: HTMLElement, ref: unknown): void {
  queueMicrotask(() => {
    const input = hostEl.querySelector('input, textarea') as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null
    setRef(ref, input)
  })
}
