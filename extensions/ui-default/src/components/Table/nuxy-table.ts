/* cspell:ignore reparenting */
import './index.css'
import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  property,
  type TemplateResult,
} from '@nuxyorg/core'
import { parseJsonArray } from '../../utils/parse.ts'

@customElement('nuxy-table-container')
export class NuxyTableContainerElement extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `

  @property({ type: String, attribute: 'container-class' })
  declare containerClass: string

  render(): TemplateResult {
    const containerClass = this.containerClass || this.getAttribute('container-class') || ''
    const tableClass = this.getAttribute('class') ?? ''

    return html`
      <div class=${['nuxy-table-container', containerClass].filter(Boolean).join(' ')}>
        <table class=${['nuxy-table', tableClass].filter(Boolean).join(' ')}>
          <slot></slot>
        </table>
      </div>
    `
  }
}

@customElement('nuxy-table-row')
export class NuxyTableRowElement extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }
  `

  render(): TemplateResult {
    const interactive = this.hasAttribute('interactive')
    const extraClass = this.getAttribute('class') ?? ''

    return html`
      <tr
        class=${['nuxy-table__tr', interactive ? 'nuxy-table__tr--interactive' : '', extraClass]
          .filter(Boolean)
          .join(' ')}
      >
        <slot></slot>
      </tr>
    `
  }
}

@customElement('nuxy-table-cell')
export class NuxyTableCellElement extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }
  `

  render(): TemplateResult {
    const isHeader = this.hasAttribute('header')
    const baseClass = isHeader ? 'nuxy-table__th' : 'nuxy-table__td'
    const extraClass = this.getAttribute('class') ?? ''
    const className = [baseClass, extraClass].filter(Boolean).join(' ')

    return isHeader
      ? html`<th class=${className}><slot></slot></th>`
      : html`<td class=${className}><slot></slot></td>`
  }
}

export interface DataListItemMeta {
  label: string
  value: string
}

function parseDataListItems(raw: string | null): DataListItemMeta[] {
  return parseJsonArray<DataListItemMeta>(raw)
}

@customElement('nuxy-data-list')
export class NuxyDataListElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .nuxy-data-list__item {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    @media (min-width: 480px) {
      .nuxy-data-list__item {
        flex-direction: row;
        align-items: baseline;
      }
      .nuxy-data-list__label {
        width: 140px;
        flex-shrink: 0;
      }
    }

    .nuxy-data-list__label {
      font-size: var(--font-sm);
      font-weight: 500;
      color: var(--syntax-comment);
    }

    .nuxy-data-list__value {
      font-size: var(--font-sm);
      color: var(--syntax-variable);
    }
  `

  static get observedAttributes(): string[] {
    return [...super.observedAttributes, 'items']
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    super.attributeChangedCallback(name, oldVal, newVal)
    if (this.isConnected) {
      this.requestUpdate()
    }
  }

  render(): TemplateResult {
    const items = parseDataListItems(this.getAttribute('items'))

    return html`
      ${items.map(
        (item) => html`
          <div class="nuxy-data-list__item">
            <span class="nuxy-data-list__label">${item.label}</span>
            <span class="nuxy-data-list__value">${item.value}</span>
          </div>
        `
      )}
    `
  }
}

@customElement('nuxy-stat')
export class NuxyStatElement extends LitElement {
  static styles = css`
    :host {
      padding: var(--space-4);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-lg);
      background: rgba(255, 255, 255, 0.02);
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .nuxy-stat__label {
      font-size: var(--font-xs);
      color: var(--syntax-comment);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .nuxy-stat__value {
      font-size: var(--font-xl);
      font-weight: 600;
      color: var(--syntax-variable);
      font-variant-numeric: tabular-nums;
    }

    .nuxy-stat__help {
      font-size: var(--font-xs);
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    .nuxy-stat__help--up {
      color: var(--syntax-green);
    }
    .nuxy-stat__help--down {
      color: var(--syntax-invalid);
    }
  `

  static get observedAttributes(): string[] {
    return [...super.observedAttributes, 'label', 'value', 'change', 'help-text']
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    super.attributeChangedCallback(name, oldVal, newVal)
    if (this.isConnected) {
      this.requestUpdate()
    }
  }

  render(): TemplateResult {
    const label = this.getAttribute('label') ?? ''
    const value = this.getAttribute('value') ?? ''
    const changeRaw = this.getAttribute('change')
    const helpText = this.getAttribute('help-text') ?? ''

    const change = changeRaw !== null && changeRaw !== '' ? Number(changeRaw) : undefined
    const isUp = change !== undefined && change > 0
    const isDown = change !== undefined && change < 0

    return html`
      <span class="nuxy-stat__label">${label}</span>
      <span class="nuxy-stat__value">${value}</span>
      ${change !== undefined || helpText
        ? html`
            <span
              class=${[
                'nuxy-stat__help',
                isUp ? 'nuxy-stat__help--up' : '',
                isDown ? 'nuxy-stat__help--down' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              ${change !== undefined
                ? html`<span
                    >${(isUp ? '↑' : isDown ? '↓' : '') + ' ' + Math.abs(change) + '%'}</span
                  >`
                : nothing}
              ${helpText ? html`<span>${helpText}</span>` : nothing}
            </span>
          `
        : nothing}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-table-container': NuxyTableContainerElement
    'nuxy-table-row': NuxyTableRowElement
    'nuxy-table-cell': NuxyTableCellElement
    'nuxy-data-list': NuxyDataListElement
    'nuxy-stat': NuxyStatElement
  }
}
