import { LitElement, html, css, nothing, customElement, property } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

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

@customElement('nuxy-properties-panel')
export class NuxyPropertiesPanelElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      background: var(--surface-overlay, rgba(255, 255, 255, 0.05));
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-4);
      font-size: var(--font-sm);
    }

    .nuxy-properties-panel__title {
      font-weight: 600;
      margin-bottom: var(--space-3);
      padding-bottom: var(--space-2);
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      opacity: 0.9;
    }

    .nuxy-properties-panel__grid {
      display: grid;
      grid-template-columns: 90px 1fr;
      gap: var(--space-2) var(--space-4);
    }

    .nuxy-properties-panel__label {
      opacity: 0.5;
      font-size: var(--font-xs);
      padding-top: var(--space-1);
    }

    .nuxy-properties-panel__value {
      color: var(--text-primary, rgba(255, 255, 255, 0.85));
    }
  `

  @property({ type: String })
  declare title: string
  @property({ type: String })
  declare rows: string

  render(): TemplateResult {
    const rows = parseRows(this.rows)

    return html`
      ${this.title ? html`<div class="nuxy-properties-panel__title">${this.title}</div>` : nothing}
      <div class="nuxy-properties-panel__grid">
        ${rows.map(
          (row) => html`
            <div class="nuxy-properties-panel__label">${row.label}</div>
            <div class="nuxy-properties-panel__value">${row.value}</div>
          `
        )}
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-properties-panel': NuxyPropertiesPanelElement
  }
}
