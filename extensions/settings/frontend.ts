import { LitElement, html, css, nothing, customElement, property, ref } from '@nuxy/core'
import type { NuxyToolElement } from '@nuxy/core'
import { SettingsController } from './controller.ts'
import type { AnyRow, RenderSection } from './types.ts'

interface NuxyInputElement extends HTMLElement {
  nativeInput: HTMLInputElement | null
}

const TAG = 'nuxy-tool-settings'

@customElement(TAG)
export class NuxyToolSettingsElement extends LitElement implements NuxyToolElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    nuxy-two-panel {
      flex: 1;
      min-height: 0;
    }

    nuxy-scroll-area {
      flex: 1;
      min-height: 0;
    }

    .nuxy-settings-language-hint {
      padding: 2px 12px 10px;
      font-size: 0.75em;
      opacity: 0.45;
    }

    .nuxy-settings-remove-hint {
      font-size: 0.75em;
      opacity: 0.35;
    }

    .nuxy-settings-ext-description {
      font-size: 0.75em;
      opacity: 0.6;
    }

    nuxy-input.nuxy-settings-input--color { width: 2.5em; }
    nuxy-input.nuxy-settings-input--text { width: 10em; }
  `

  @property({ type: String })
  declare committedQuery: string
  @property({ type: String })
  declare extensionId: string

  private controller: SettingsController | null = null
  private _query = ''

  get query(): string {
    return this._query
  }

  set query(value: string) {
    const next = value ?? ''
    if (this._query === next) return
    this._query = next
    this.controller?.setFilterQuery(next)
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.controller = new SettingsController(() => this.requestUpdate())
    this.controller.connect()
    if (this._query) this.controller.setFilterQuery(this._query)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.controller?.disconnect()
    this.controller = null
  }

  render() {
    if (!this.controller) return nothing

    const meta = this.controller.computedMeta
    if (!meta) return nothing

    const effectiveSectionId = this.controller.effectiveSectionId
    const sections = meta.sectionsToRender
    const sectionIndex = sections.findIndex((s) => s.id === effectiveSectionId)
    const selectedSection = sectionIndex >= 0 ? sections[sectionIndex] : null
    const { focusedPanel } = this.controller.state

    return html`
      <nuxy-two-panel split="130px">
        <div>
          <nuxy-list active-index=${focusedPanel === 'left' ? sectionIndex : -1}>
            ${sections.map(
              (section) => html`
                <nuxy-list-item
                  ?active=${focusedPanel === 'left' && section.id === effectiveSectionId}
                  @click=${() => this.controller?.setSelectedSection(section.id)}
                >
                  <nuxy-list-item-body>
                    <nuxy-list-item-text>${section.label}</nuxy-list-item-text>
                  </nuxy-list-item-body>
                </nuxy-list-item>
              `
            )}
          </nuxy-list>
        </div>
        <nuxy-scroll-area>
          ${selectedSection ? this.renderSection(selectedSection) : nothing}
        </nuxy-scroll-area>
      </nuxy-two-panel>
    `
  }

  private renderSection(section: RenderSection) {
    if (!this.controller) return nothing
    const meta = this.controller.computedMeta
    if (!meta) return nothing

    const { selectedRow } = this.controller.state
    const start = meta.sectionStartIndex[section.id] ?? 0
    const end = start + section.resolvedRows.length
    const sectionActiveIndex = selectedRow >= start && selectedRow < end ? selectedRow - start : -1

    return html`
      <nuxy-list active-index=${sectionActiveIndex} scroll-speed="0.15">
        ${section.resolvedRows.map((row, i) => this.renderSettingRow(section, row, i))}
      </nuxy-list>
      ${section.id === 'language'
        ? html`
            <div class="nuxy-settings-language-hint">${this.controller?.t.t('language.hint')}</div>
          `
        : nothing}
    `
  }

  private renderSettingRow(section: RenderSection, row: AnyRow, i: number) {
    if (!this.controller) return nothing

    const meta = this.controller.computedMeta
    if (!meta) return nothing

    const globalIdx = (meta.sectionStartIndex[section.id] ?? 0) + i
    const currentValue = this.controller.getRowValue(row)
    const options = this.controller.getRowOpts(row)
    const { selectedRow, activeSelect, selectFocused } = this.controller.state

    const isLanguageRow = 'isLanguage' in row && row.isLanguage
    const isLanguageRemoveRow = 'isLanguageRemove' in row && row.isLanguageRemove
    const isExtToggleRow = 'isExtToggle' in row && row.isExtToggle
    const isSelectType =
      isLanguageRow ||
      isExtToggleRow ||
      !row.isExtension ||
      row.type === 'select' ||
      row.type === 'toggle'

    const isActive = globalIdx === selectedRow && activeSelect === null

    if (isLanguageRemoveRow) {
      return html`
        <nuxy-list-item ?active=${isActive} @click=${() => this.controller?.onItemClick(globalIdx)}>
          <nuxy-list-item-body>
            <nuxy-list-item-text>${row.label}</nuxy-list-item-text>
          </nuxy-list-item-body>
          <nuxy-list-item-actions>
            <span class="nuxy-settings-remove-hint">↵ remove</span>
          </nuxy-list-item-actions>
        </nuxy-list-item>
      `
    }

    return html`
      <nuxy-list-item ?active=${isActive} @click=${() => this.controller?.onItemClick(globalIdx)}>
        <nuxy-list-item-body>
          <nuxy-list-item-text>${row.label}</nuxy-list-item-text>
          ${row.isExtension && row.description
            ? html`<span class="nuxy-settings-ext-description">${row.description}</span>`
            : nothing}
        </nuxy-list-item-body>
        <nuxy-list-item-actions>
          ${isSelectType
            ? html`
                <nuxy-select-box
                  options=${JSON.stringify(options)}
                  value=${currentValue !== undefined ? String(currentValue) : ''}
                  ?open=${activeSelect === row.key}
                  focused-index=${selectFocused}
                  scroll-lookahead="48"
                  scroll-speed="0.25"
                  placeholder=${options?.length === 0 ? '(none)' : '—'}
                  ?searchable=${isLanguageRow
                    ? true
                    : row.isExtension
                      ? false
                      : ('searchable' in row ? row.searchable : false) || false}
                  @nuxy-select-box-select=${(e: CustomEvent<{ value: string }>) =>
                    this.controller?.handleRowSelect(row, e.detail.value)}
                  @nuxy-select-box-close-request=${() => this.controller?.setActiveSelect(null)}
                  @nuxy-select-box-open-request=${(e: CustomEvent<{ startIndex: number }>) =>
                    this.controller?.onSelectOpen(row.key, globalIdx, e.detail.startIndex)}
                ></nuxy-select-box>
              `
            : row.isExtension
              ? html`
                  <nuxy-input
                    type=${row.type === 'color' ? 'color' : 'text'}
                    value=${currentValue !== undefined ? String(currentValue) : ''}
                    placeholder=${('placeholder' in row ? row.placeholder : '') || ''}
                    class=${row.type === 'color' ? 'nuxy-settings-input--color' : 'nuxy-settings-input--text'}
                    ${ref((el) => {
                      const nuxyInput = el as NuxyInputElement | null
                      if (nuxyInput) {
                        const input = nuxyInput.nativeInput || nuxyInput.querySelector('input')
                        if (this.controller) {
                          this.controller.inputRefs[row.key] = input
                          if (input) {
                            input.oninput = () =>
                              this.controller?.handleExtInputChange(row, input.value)
                            input.onblur = () =>
                              this.controller?.handleExtInputBlur(row, input.value)
                            input.onkeydown = (e: KeyboardEvent) => {
                              if (e.key === 'Enter' || e.key === 'Escape') {
                                input.blur()
                              }
                            }
                          }
                        }
                      } else {
                        if (this.controller) {
                          this.controller.inputRefs[row.key] = null
                        }
                      }
                    })}
                  ></nuxy-input>
                `
              : nothing}
        </nuxy-list-item-actions>
      </nuxy-list-item>
    `
  }
}
