import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  state,
  type TemplateResult,
} from '@nuxy/core'
import { toastStore, type Toast, type ToastType } from './store'

const EXIT_MS = 220

@customElement('nuxy-toaster')
export class NuxyToasterElement extends LitElement {
  static styles = css`
    :host {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      overflow: hidden;
      border-top: 1px solid transparent;
    }

    .nuxy-toast {
      background-color: var(--bg-base);
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      animation: nuxy-toast-rise 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      box-sizing: border-box;
    }

    .nuxy-toast--compact {
      position: absolute;
      inset: 0;
      font-size: var(--font-xs);
      line-height: 1;
      padding: var(--space-3) var(--space-5);
    }

    .nuxy-toast--multiline {
      position: absolute;
      inset: 0;
      align-items: flex-start;
      font-size: var(--font-xs);
      line-height: 1.3;
      padding: var(--space-3) var(--space-5);
    }

    .nuxy-toast--exiting {
      animation: nuxy-toast-sink 0.22s cubic-bezier(0.4, 0, 1, 1) forwards;
    }

    .nuxy-toast-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .nuxy-toast--compact .nuxy-toast-body {
      flex-direction: row;
      align-items: center;
      gap: var(--space-2);
    }

    .nuxy-toast-title {
      font-weight: 600;
      color: var(--syntax-variable);
    }

    .nuxy-toast-message {
      color: var(--syntax-keyword);
    }

    .nuxy-toast--compact .nuxy-toast-message {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nuxy-toast-close {
      flex-shrink: 0;
      background: transparent;
      border: none;
      color: var(--syntax-comment);
      cursor: pointer;
      padding: 0;
      line-height: 0;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;
    }

    .nuxy-toast-close:hover {
      background-color: color-mix(in srgb, var(--syntax-comment) 30%, transparent);
      color: var(--syntax-variable);
    }

    @keyframes nuxy-toast-rise {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes nuxy-toast-sink {
      from {
        transform: translateY(0);
        opacity: 1;
      }
      to {
        transform: translateY(100%);
        opacity: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .nuxy-toast,
      .nuxy-toast--exiting {
        animation: none;
      }
    }
  `

  @state()
  declare private toasts: Toast[]

  private unsubscribe: (() => void) | null = null
  private dismissTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private exitingIds = new Set<string>()

  connectedCallback(): void {
    super.connectedCallback()
    this.toasts = toastStore.getToasts()
    this.unsubscribe = toastStore.subscribe((toasts) => {
      this.syncDismissTimers(toasts)
      this.toasts = toasts
    })
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unsubscribe?.()
    this.unsubscribe = null
    for (const timer of this.dismissTimers.values()) clearTimeout(timer)
    this.dismissTimers.clear()
    this.exitingIds.clear()
  }

  private syncDismissTimers(toasts: Toast[]): void {
    const activeIds = new Set(toasts.map((t) => t.id))

    for (const [id, timer] of this.dismissTimers) {
      if (!activeIds.has(id)) {
        clearTimeout(timer)
        this.dismissTimers.delete(id)
      }
    }

    for (const toast of toasts) {
      if (this.dismissTimers.has(toast.id) || this.exitingIds.has(toast.id)) continue
      const duration = toast.duration ?? 0
      if (duration <= 0) continue
      this.dismissTimers.set(
        toast.id,
        setTimeout(() => this.dismiss(toast.id), duration)
      )
    }
  }

  private dismiss(id: string): void {
    this.dismissTimers.delete(id)
    if (this.exitingIds.has(id)) return

    const el = this.renderRoot.querySelector(`[data-toast-id="${id}"]`)
    if (el) {
      this.exitingIds.add(id)
      el.classList.add('nuxy-toast--exiting')
      setTimeout(() => {
        toastStore.remove(id)
        this.exitingIds.delete(id)
      }, EXIT_MS)
    } else {
      toastStore.remove(id)
    }
  }

  private onClose(toast: Toast): void {
    const timer = this.dismissTimers.get(toast.id)
    if (timer) {
      clearTimeout(timer)
      this.dismissTimers.delete(toast.id)
    }
    this.dismiss(toast.id)
  }

  private renderToast(toast: Toast): TemplateResult {
    const type = toast.type || 'info'
    const compact = !toast.title
    const close = () => this.onClose(toast)

    return html`
      <div
        class="nuxy-toast nuxy-toast--${type} ${compact
          ? 'nuxy-toast--compact'
          : 'nuxy-toast--multiline'}"
        role="alert"
        data-toast-id="${toast.id}"
      >
        <div class="nuxy-toast-body">
          ${toast.title ? html`<div class="nuxy-toast-title">${toast.title}</div>` : nothing}
          <div class="nuxy-toast-message">${toast.message}</div>
        </div>
        <button class="nuxy-toast-close" aria-label="Close" @click=${close}>
          <nuxy-icon name="Close" size="10" opacity="1"></nuxy-icon>
        </button>
      </div>
    `
  }

  render() {
    if (this.toasts.length === 0) return nothing
    return html`${this.toasts.map((t) => this.renderToast(t))}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-toaster': NuxyToasterElement
  }
}
