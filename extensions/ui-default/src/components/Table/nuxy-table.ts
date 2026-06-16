import './index.css'
import { LitElement, html, css, nothing, customElement, type TemplateResult } from '@nuxyorg/core'

const TABLE_HOST_ATTRS = new Set(['container-class', 'class', 'style'])

// NuxyTableContainerElement: slot-based child reparenting into <table> — keep as HTMLElement
export class NuxyTableContainerElement extends HTMLElement {
  private container: HTMLDivElement | null = null
  private table: HTMLTableElement | null = null

  static get observedAttributes(): string[] {
    return ['container-class']
  }

  connectedCallback(): void {
    this.build()
    this.sync()
    this.forwardAttrsToTable()
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'container-class' || name === 'class') this.sync()
    else this.forwardAttrsToTable()
  }

  private build(): void {
    if (this.container) return

    this.container = document.createElement('div')
    this.table = document.createElement('table')

    const nodes: Node[] = []
    for (const child of this.childNodes) nodes.push(child)

    this.container.appendChild(this.table)
    for (const node of nodes) {
      this.table.appendChild(node)
    }
    this.appendChild(this.container)
  }

  private sync(): void {
    const containerClass = this.getAttribute('container-class') ?? ''
    const tableClass = this.getAttribute('class') ?? ''

    if (this.container) {
      this.container.className = ['nuxy-table-container', containerClass].filter(Boolean).join(' ')
    }
    if (this.table) {
      this.table.className = ['nuxy-table', tableClass].filter(Boolean).join(' ')
    }
  }

  private forwardAttrsToTable(): void {
    if (!this.table) return
    for (const attr of this.attributes) {
      if (TABLE_HOST_ATTRS.has(attr.name)) continue
      this.table.setAttribute(attr.name, attr.value)
    }
  }
}

// NuxyTableRowElement: slot-based child reparenting into <tr> — keep as HTMLElement
export class NuxyTableRowElement extends HTMLElement {
  private row: HTMLTableRowElement | null = null

  static get observedAttributes(): string[] {
    return ['interactive']
  }

  connectedCallback(): void {
    this.build()
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private build(): void {
    if (this.row) return

    this.row = document.createElement('tr')
    const nodes: Node[] = []
    for (const child of this.childNodes) nodes.push(child)

    for (const node of nodes) {
      this.row.appendChild(node)
    }
    this.appendChild(this.row)
  }

  private sync(): void {
    const interactive = this.hasAttribute('interactive')
    const extraClass = this.getAttribute('class') ?? ''

    if (this.row) {
      this.row.className = [
        'nuxy-table__tr',
        interactive ? 'nuxy-table__tr--interactive' : '',
        extraClass,
      ]
        .filter(Boolean)
        .join(' ')
    }
  }
}

// NuxyTableCellElement: slot-based child reparenting into <th>/<td> — keep as HTMLElement
export class NuxyTableCellElement extends HTMLElement {
  private cell: HTMLTableCellElement | null = null

  static get observedAttributes(): string[] {
    return ['header']
  }

  connectedCallback(): void {
    this.build()
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private build(): void {
    if (this.cell) return

    const isHeader = this.hasAttribute('header')
    this.cell = document.createElement(isHeader ? 'th' : 'td')

    const nodes: Node[] = []
    for (const child of this.childNodes) nodes.push(child)

    for (const node of nodes) {
      this.cell.appendChild(node)
    }
    this.appendChild(this.cell)
  }

  private sync(): void {
    const isHeader = this.hasAttribute('header')
    const baseClass = isHeader ? 'nuxy-table__th' : 'nuxy-table__td'
    const extraClass = this.getAttribute('class') ?? ''

    if (this.cell) {
      this.cell.className = [baseClass, extraClass].filter(Boolean).join(' ')
    }
  }
}

export interface DataListItemMeta {
  label: string
  value: string
}

function parseDataListItems(raw: string | null): DataListItemMeta[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as DataListItemMeta[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
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
    return ['items']
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
    return ['label', 'value', 'change', 'help-text']
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

if (!customElements.get('nuxy-table-container')) {
  customElements.define('nuxy-table-container', NuxyTableContainerElement)
}
if (!customElements.get('nuxy-table-row')) {
  customElements.define('nuxy-table-row', NuxyTableRowElement)
}
if (!customElements.get('nuxy-table-cell')) {
  customElements.define('nuxy-table-cell', NuxyTableCellElement)
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
