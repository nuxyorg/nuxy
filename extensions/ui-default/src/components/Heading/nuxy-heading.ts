import { LitElement, html, css, customElement, property } from '@nuxy/core'
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

  @property({ type: String })
  declare level: string
  @property({ type: String })
  declare as: string

  render(): TemplateResult {
    const levelRaw = this.as || this.level || '2'
    const level = Math.min(6, Math.max(1, Number(levelRaw.replace('h', '')) || 2)) as HeadingLevel
    const className = `nuxy-heading nuxy-heading--${level}`
    switch (level) {
      case 1: return html`<h1 class="${className}"><slot></slot></h1>`
      case 3: return html`<h3 class="${className}"><slot></slot></h3>`
      case 4: return html`<h4 class="${className}"><slot></slot></h4>`
      case 5: return html`<h5 class="${className}"><slot></slot></h5>`
      case 6: return html`<h6 class="${className}"><slot></slot></h6>`
      default: return html`<h2 class="${className}"><slot></slot></h2>`
    }
  }
}

export type { HeadingLevel }

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-heading': NuxyHeadingElement
  }
}
