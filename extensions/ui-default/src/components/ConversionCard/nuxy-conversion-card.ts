import { LitElement, html, css, nothing, customElement, ref } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

@customElement('nuxy-conversion-card')
export class NuxyConversionCardElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      width: 100%;
    }

    .nuxy-conversion-card__label {
      font-size: var(--font-xs);
      font-weight: 600;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--text-muted, rgba(255, 255, 255, 0.4));
    }

    .nuxy-conversion-card__body {
      display: flex;
      align-items: center;
      border-radius: var(--radius-xl);
      overflow: hidden;
      background: var(--surface-overlay, rgba(20, 20, 20, 0.65));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      position: relative;
      min-height: calc(var(--space-6) * 2);
    }

    .nuxy-conversion-card__panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-4) var(--space-5);
    }

    .nuxy-conversion-card__panel--from {
      border-right: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .nuxy-conversion-card__arrow {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      color: var(--text-muted, rgba(255, 255, 255, 0.3));
      font-size: var(--font-lg);
      pointer-events: none;
      z-index: 1;
    }
  `

  private observer = new MutationObserver(() => {
    if (this.isConnected) this.requestUpdate()
  })

  private _labelRef: HTMLDivElement | null = null
  private _fromRef: HTMLDivElement | null = null
  private _toRef: HTMLDivElement | null = null

  connectedCallback(): void {
    super.connectedCallback()
    this.observer.observe(this, { childList: true, subtree: true })
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.observer.disconnect()
  }

  private onLabelRef = (el: Element | undefined): void => {
    this._labelRef = (el as HTMLDivElement | null | undefined) ?? null
    this.syncSlots()
  }

  private onFromRef = (el: Element | undefined): void => {
    this._fromRef = (el as HTMLDivElement | null | undefined) ?? null
    this.syncSlots()
  }

  private onToRef = (el: Element | undefined): void => {
    this._toRef = (el as HTMLDivElement | null | undefined) ?? null
    this.syncSlots()
  }

  updated(): void {
    this.syncSlots()
  }

  private syncSlots(): void {
    const label = this.querySelector(':scope > [data-label]')
    const from = this.querySelector(':scope > [data-from]')
    const to = this.querySelector(':scope > [data-to]')

    for (const marker of [label, from, to]) {
      if (marker instanceof HTMLElement) {
        marker.hidden = true
        marker.style.display = 'none'
      }
    }

    if (this._labelRef) {
      if (label) {
        this._labelRef.hidden = false
        this._labelRef.replaceChildren(
          ...Array.from(label.childNodes).map((n) => n.cloneNode(true))
        )
      } else {
        this._labelRef.hidden = true
      }
    }

    if (this._fromRef && from) {
      this._fromRef.replaceChildren(...Array.from(from.childNodes).map((n) => n.cloneNode(true)))
    }

    if (this._toRef && to) {
      this._toRef.replaceChildren(...Array.from(to.childNodes).map((n) => n.cloneNode(true)))
    }
  }

  render(): TemplateResult {
    const label = this.querySelector(':scope > [data-label]')

    return html`
      ${label
        ? html`<div class="nuxy-conversion-card__label" ${ref(this.onLabelRef)}></div>`
        : nothing}
      <div class="nuxy-conversion-card__body">
        <div
          class="nuxy-conversion-card__panel nuxy-conversion-card__panel--from"
          ${ref(this.onFromRef)}
        ></div>
        <div class="nuxy-conversion-card__arrow">→</div>
        <div
          class="nuxy-conversion-card__panel nuxy-conversion-card__panel--to"
          ${ref(this.onToRef)}
        ></div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-conversion-card': NuxyConversionCardElement
  }
}
