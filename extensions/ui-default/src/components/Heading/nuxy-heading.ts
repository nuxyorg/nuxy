import { LitElement, html, css, customElement, property, unsafeHTML } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

@customElement('nuxy-heading')
export class NuxyHeadingElement extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .nuxy-heading {
      margin: 0;
      font-weight: 600;
      color: var(--syntax-variable);
      line-height: 1.3;
    }
    .nuxy-heading--1 {
      font-size: 28px;
    }
    .nuxy-heading--2 {
      font-size: 22px;
    }
    .nuxy-heading--3 {
      font-size: var(--font-xl);
    }
    .nuxy-heading--4 {
      font-size: var(--font-lg);
    }
    .nuxy-heading--5 {
      font-size: var(--font-md);
    }
    .nuxy-heading--6 {
      font-size: var(--font-sm);
    }
  `

  @property({ type: String }) level = '2'
  @property({ type: String }) as = ''

  private _innerContent = ''

  connectedCallback(): void {
    // Capture children before Lit renders (replaces them)
    this._innerContent = this.innerHTML
    super.connectedCallback()
  }

  render(): TemplateResult {
    const levelRaw = this.as || this.level || '2'
    const level = Math.min(6, Math.max(1, Number(levelRaw.replace('h', '')) || 2)) as HeadingLevel
    const className = `nuxy-heading nuxy-heading--${level}`
    return html`${unsafeHTML(`<h${level} class="${className}">${this._innerContent}</h${level}>`)}`
  }
}

export type { HeadingLevel }

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-heading': NuxyHeadingElement
  }
}
