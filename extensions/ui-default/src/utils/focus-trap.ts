import { getFocusableElements, trapTabKey } from '@nuxyorg/core'

export { getFocusableElements, trapTabKey }

/** Attach Escape + Tab trap handlers for a dialog root element. Returns a cleanup function. */
export function bindDialogKeyHandlers(dialog: HTMLElement, onEscape: () => void): () => void {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onEscape()
      return
    }
    trapTabKey(dialog, e)
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}
