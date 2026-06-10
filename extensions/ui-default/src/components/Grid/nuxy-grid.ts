import { LitElement, html, css, nothing, customElement, property, ref } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'
import { smoothScrollIntoViewIfNeeded } from '../../hooks/scroll-into-view'

@customElement('nuxy-grid')
export class NuxyGridElement extends LitElement {
  static styles = css`
    :host {
      display: grid;
      padding: 4px 8px;
    }
  `

  @property({ type: String })
  declare cols: string
  @property({ type: String })
  declare gap: string

  connectedCallback(): void {
    super.connectedCallback()
    this.sync()
  }

  updated(): void {
    this.sync()
  }

  private sync(): void {
    this.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`
    this.style.gap = `${this.gap}px`
  }

  render() {
    return html`<slot></slot>`
  }
}

@customElement('nuxy-grid-item')
export class NuxyGridItemElement extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }

    .nuxy-grid-item {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      border-radius: var(--radius-md);
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      position: relative;
      color: inherit;
      outline: none;
      transition: background 0.1s;
    }

    .nuxy-grid-item:hover {
      background: var(--syntax-comment);
    }

    .nuxy-grid-item--active {
      background: var(--syntax-comment);
      box-shadow: inset 0 0 0 1px var(--syntax-operator);
    }
  `

  @property({ type: Boolean, reflect: true })
  declare active: boolean
  @property({ type: Boolean })
  declare disabled: boolean
  @property({ type: String })
  declare type: string
  @property({ type: String })
  declare title: string
  @property({ attribute: 'aria-label', type: String })
  declare ariaLabel: string
  @property({ type: String })
  declare tabindex: string

  private buttonRef: HTMLButtonElement | null = null

  updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('active') && this.active && this.buttonRef) {
      smoothScrollIntoViewIfNeeded(this.buttonRef)
    }
  }

  private onButtonRef = (el: Element | undefined): void => {
    this.buttonRef = (el as HTMLButtonElement | null | undefined) ?? null
  }

  render(): TemplateResult {
    const active = this.active || this.hasAttribute('active')
    const disabled = this.disabled || this.hasAttribute('disabled')
    const btnType = this.type || this.getAttribute('type') || 'button'
    const titleAttr = this.title || this.getAttribute('title') || ''
    const ariaLabelAttr = this.ariaLabel || this.getAttribute('aria-label') || ''
    const tabindexAttr = this.tabindex || this.getAttribute('tabindex') || ''

    const btnClass = ['nuxy-grid-item', active ? 'nuxy-grid-item--active' : '']
      .filter(Boolean)
      .join(' ')

    return html`
      <button
        class=${btnClass}
        type=${btnType}
        title=${titleAttr || nothing}
        aria-label=${ariaLabelAttr || nothing}
        tabindex=${tabindexAttr || nothing}
        ?disabled=${disabled}
        ${ref(this.onButtonRef)}
      >
        <slot></slot>
      </button>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-grid': NuxyGridElement
    'nuxy-grid-item': NuxyGridItemElement
  }
}
