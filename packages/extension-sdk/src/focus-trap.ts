/** DOM focus-trap helpers for modal/dialog-like overlays. Frontend-only — not used by extension backends. */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function getFocusableElements(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  )
}

/** Call from a `keydown` handler scoped to the dialog's root element to keep Tab focus inside `container`. */
export function trapTabKey(container: Element, e: KeyboardEvent): void {
  if (e.key !== 'Tab') return
  const focusable = getFocusableElements(container)
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
