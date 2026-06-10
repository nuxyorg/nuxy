import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  state,
  type TemplateResult,
} from '@nuxy/core'
import { toastStore, type Toast } from './store'

const CLOSE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`

@customElement('nuxy-toaster')
export class NuxyToasterElement extends LitElement {
  static styles = css`
    :host {
      position: fixed;
      bottom: var(--space-4);
      right: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      z-index: var(--z-toast, 10002);
      pointer-events: none;
    }

    .nuxy-toast {
      background-color: var(--bg-base);
      border: 1px solid var(--syntax-comment);
      border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-4);
      min-width: 280px;
      max-width: 360px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      pointer-events: auto;

      /* Animation */
      animation: nuxy-toast-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* Toast Exiting Animation Class */
    .nuxy-toast--exiting {
      animation: nuxy-toast-slide-out 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .nuxy-toast-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-1);
    }

    .nuxy-toast-title {
      font-weight: 600;
      font-size: var(--font-md);
      color: var(--syntax-variable);
    }

    .nuxy-toast-close {
      background: transparent;
      border: none;
      color: var(--syntax-keyword);
      cursor: pointer;
      padding: var(--space-0);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;
    }

    .nuxy-toast-close:hover {
      background-color: var(--syntax-comment);
      color: var(--syntax-variable);
    }

    .nuxy-toast-message {
      font-size: var(--font-body);
      color: var(--syntax-keyword);
      line-height: 1.4;
    }

    /* Type variations */
    .nuxy-toast--info {
      border-left: 3px solid var(--syntax-operator);
    }
    .nuxy-toast--success {
      border-left: 3px solid var(--syntax-green);
    }
    .nuxy-toast--warning {
      border-left: 3px solid var(--syntax-constant);
    }
    .nuxy-toast--error {
      border-left: 3px solid var(--syntax-invalid);
    }

    @keyframes nuxy-toast-slide-in {
      from {
        transform: translateX(110%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes nuxy-toast-slide-out {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(110%);
        opacity: 0;
      }
    }
  `

  @state() private toasts: Toast[] = []

  private unsubscribe: (() => void) | null = null

  connectedCallback(): void {
    super.connectedCallback()
    this.toasts = toastStore.getToasts()
    this.unsubscribe = toastStore.subscribe((toasts) => {
      this.toasts = toasts
    })
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unsubscribe?.()
    this.unsubscribe = null
  }

  private onClose(toast: Toast): void {
    const el = this.renderRoot.querySelector(`[data-toast-id="${toast.id}"]`)
    if (el) {
      el.classList.add('nuxy-toast--exiting')
      setTimeout(() => toastStore.remove(toast.id), 200)
    } else {
      toastStore.remove(toast.id)
    }
  }

  private renderToast(toast: Toast): TemplateResult {
    const close = () => this.onClose(toast)

    if (toast.title) {
      return html`
        <div
          class="nuxy-toast nuxy-toast--${toast.type || 'info'}"
          role="alert"
          data-toast-id="${toast.id}"
        >
          <div class="nuxy-toast-header">
            <span class="nuxy-toast-title">${toast.title}</span>
            <button class="nuxy-toast-close" aria-label="Close" @click=${close}>
              <span .innerHTML=${CLOSE_SVG}></span>
            </button>
          </div>
          <div class="nuxy-toast-message">${toast.message}</div>
        </div>
      `
    }

    return html`
      <div
        class="nuxy-toast nuxy-toast--${toast.type || 'info'}"
        role="alert"
        data-toast-id="${toast.id}"
      >
        <div class="nuxy-toast-message">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <span>${toast.message}</span>
            <button
              class="nuxy-toast-close"
              aria-label="Close"
              style="margin-left:8px"
              @click=${close}
            >
              <span .innerHTML=${CLOSE_SVG}></span>
            </button>
          </div>
        </div>
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
