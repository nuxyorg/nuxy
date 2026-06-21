import {
  LitElement,
  html,
  nothing,
  customElement,
  property,
  type TemplateResult,
} from '@nuxyorg/core'
import type { NuxyToolElement } from '@nuxyorg/core'
import { AngrysearchController } from './controller.ts'
import type { AngrysearchItem } from './types.ts'

@customElement('nuxy-tool-angrysearch')
export class NuxyToolAngrysearchElement extends LitElement implements NuxyToolElement {
  @property({ type: String })
  declare committedQuery: string
  @property({ type: String })
  declare extensionId: string

  private controller: AngrysearchController | null = null
  private _query = ''

  protected createRenderRoot(): HTMLElement {
    return this
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.controller = new AngrysearchController(() => this.requestUpdate())
    this.controller.connect()
    if (this._query) this.controller.setQuery(this._query)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.controller?.disconnect()
    this.controller = null
  }

  get query(): string {
    return this._query
  }

  set query(value: string) {
    const next = value ?? ''
    if (this._query === next) return
    this._query = next
    this.controller?.setQuery(next)
  }

  render() {
    if (!this.controller) return nothing
    const { items, query, selectedIndex } = this.controller.state
    const t = this.controller.t.t

    if (query.trim().length < 3) {
      return html`<nuxy-empty-state
        message=${t('empty.typeToSearch')}
        hint=${t('empty.typeHint')}
      ></nuxy-empty-state>`
    }

    if (items.length === 0) {
      return html`<nuxy-empty-state
        message=${t('empty.noMatches')}
        hint=${t('empty.noMatchesHint')}
      ></nuxy-empty-state>`
    }

    return html`
      <nuxy-list active-index=${selectedIndex}>
        ${items.map((item, idx) => this.renderItem(item, idx))}
      </nuxy-list>
    `
  }

  private renderItem(item: AngrysearchItem, idx: number): TemplateResult {
    const selectedIndex = this.controller!.state.selectedIndex
    return html`
      <nuxy-list-item
        ?active=${idx === selectedIndex}
        @click=${() => this.controller?.setSelectedIndex(idx)}
      >
        <nuxy-list-item-body>
          <nuxy-list-item-text ?active=${idx === selectedIndex}>
            <nuxy-icon name=${item.isDir ? 'folder' : 'file'}></nuxy-icon>
            ${item.title}
          </nuxy-list-item-text>
          <nuxy-list-item-meta>${item.subtitle}</nuxy-list-item-meta>
        </nuxy-list-item-body>
      </nuxy-list-item>
    `
  }
}
