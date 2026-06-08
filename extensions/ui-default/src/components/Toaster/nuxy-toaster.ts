import './index.css'
import { toastStore, type Toast } from './store'

const CLOSE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`

function createCloseButton(onClose: () => void): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = 'nuxy-toast-close'
  btn.setAttribute('aria-label', 'Close')
  btn.innerHTML = CLOSE_SVG
  btn.addEventListener('click', onClose)
  return btn
}

function renderToast(toast: Toast, onRemove: (id: string) => void): HTMLElement {
  const el = document.createElement('div')
  el.className = `nuxy-toast nuxy-toast--${toast.type || 'info'}`
  el.setAttribute('role', 'alert')

  const close = () => {
    el.classList.add('nuxy-toast--exiting')
    setTimeout(() => onRemove(toast.id), 200)
  }

  if (toast.title) {
    const header = document.createElement('div')
    header.className = 'nuxy-toast-header'
    const title = document.createElement('span')
    title.className = 'nuxy-toast-title'
    title.textContent = toast.title
    header.append(title, createCloseButton(close))
    el.appendChild(header)

    const message = document.createElement('div')
    message.className = 'nuxy-toast-message'
    message.textContent = toast.message
    el.appendChild(message)
  } else {
    const message = document.createElement('div')
    message.className = 'nuxy-toast-message'
    const row = document.createElement('div')
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start'
    const text = document.createElement('span')
    text.textContent = toast.message
    const btn = createCloseButton(close)
    btn.style.marginLeft = '8px'
    row.append(text, btn)
    message.appendChild(row)
    el.appendChild(message)
  }

  return el
}

export class NuxyToasterElement extends HTMLElement {
  private unsubscribe: (() => void) | null = null

  connectedCallback(): void {
    this.classList.add('nuxy-toaster')
    this.render(toastStore.getToasts())
    this.unsubscribe = toastStore.subscribe((toasts) => this.render(toasts))
  }

  disconnectedCallback(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
  }

  private render(toasts: Toast[]): void {
    this.replaceChildren()
    for (const t of toasts) {
      this.appendChild(renderToast(t, (id) => toastStore.remove(id)))
    }
  }
}

if (!customElements.get('nuxy-toaster')) {
  customElements.define('nuxy-toaster', NuxyToasterElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-toaster': NuxyToasterElement
  }
}
