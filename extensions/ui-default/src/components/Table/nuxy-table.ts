import './index.css'
import { syncHostClasses } from '../../h.ts'

const TABLE_HOST_ATTRS = new Set(['container-class', 'class', 'style'])

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

export class NuxyDataListElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['items']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const items = parseDataListItems(this.getAttribute('items'))
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-data-list')
    this.replaceChildren()

    for (const item of items) {
      const row = document.createElement('div')
      row.className = 'nuxy-data-list__item'

      const label = document.createElement('span')
      label.className = 'nuxy-data-list__label'
      label.textContent = item.label

      const value = document.createElement('span')
      value.className = 'nuxy-data-list__value'
      value.textContent = item.value

      row.append(label, value)
      this.appendChild(row)
    }
  }
}

export class NuxyStatElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['label', 'value', 'change', 'help-text']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const label = this.getAttribute('label') ?? ''
    const value = this.getAttribute('value') ?? ''
    const changeRaw = this.getAttribute('change')
    const helpText = this.getAttribute('help-text') ?? ''
    const extraClass = this.getAttribute('class') ?? ''

    const change = changeRaw !== null && changeRaw !== '' ? Number(changeRaw) : undefined
    const isUp = change !== undefined && change > 0
    const isDown = change !== undefined && change < 0

    syncHostClasses(this, 'nuxy-stat')
    this.replaceChildren()

    const labelEl = document.createElement('span')
    labelEl.className = 'nuxy-stat__label'
    labelEl.textContent = label

    const valueEl = document.createElement('span')
    valueEl.className = 'nuxy-stat__value'
    valueEl.textContent = value

    this.append(labelEl, valueEl)

    if (change !== undefined || helpText) {
      const helpEl = document.createElement('span')
      helpEl.className = [
        'nuxy-stat__help',
        isUp ? 'nuxy-stat__help--up' : '',
        isDown ? 'nuxy-stat__help--down' : '',
      ]
        .filter(Boolean)
        .join(' ')

      if (change !== undefined) {
        const changeEl = document.createElement('span')
        const arrow = isUp ? '↑' : isDown ? '↓' : ''
        changeEl.textContent = `${arrow} ${Math.abs(change)}%`.trim()
        helpEl.appendChild(changeEl)
      }
      if (helpText) {
        const textEl = document.createElement('span')
        textEl.textContent = helpText
        helpEl.appendChild(textEl)
      }

      this.appendChild(helpEl)
    }
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
if (!customElements.get('nuxy-data-list')) {
  customElements.define('nuxy-data-list', NuxyDataListElement)
}
if (!customElements.get('nuxy-stat')) {
  customElements.define('nuxy-stat', NuxyStatElement)
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
