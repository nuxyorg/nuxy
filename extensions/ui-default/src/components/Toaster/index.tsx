import './nuxy-toaster.ts'
export { toastStore, toast } from './store'
export type { ToastOptions } from './store'

/** Mount point helper — shell creates nuxy-toaster directly; kept for API compat. */
export function Toaster(): HTMLElement {
  return document.createElement('nuxy-toaster')
}
