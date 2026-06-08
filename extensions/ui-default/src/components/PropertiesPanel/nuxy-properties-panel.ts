import './index.css'

export interface PropertyRowData {
  label: string
  value: string
}

function parseRows(raw: string | null): PropertyRowData[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as PropertyRowData[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export class NuxyPropertiesPanelElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['title', 'rows']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const title = this.getAttribute('title')
    const rows = parseRows(this.getAttribute('rows'))

    this.className = 'nuxy-properties-panel'
    this.replaceChildren()

    if (title) {
      const titleEl = document.createElement('div')
      titleEl.className = 'nuxy-properties-panel__title'
      titleEl.textContent = title
      this.appendChild(titleEl)
    }

    const grid = document.createElement('div')
    grid.className = 'nuxy-properties-panel__grid'

    for (const row of rows) {
      const labelEl = document.createElement('div')
      labelEl.className = 'nuxy-properties-panel__label'
      labelEl.textContent = row.label

      const valueEl = document.createElement('div')
      valueEl.className = 'nuxy-properties-panel__value'
      valueEl.textContent = row.value

      grid.append(labelEl, valueEl)
    }

    this.appendChild(grid)
  }
}

if (!customElements.get('nuxy-properties-panel')) {
  customElements.define('nuxy-properties-panel', NuxyPropertiesPanelElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-properties-panel': NuxyPropertiesPanelElement
  }
}
