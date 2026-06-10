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
  `
  @property({ type: String }) query = ''
  @property({ type: String }) committedQuery = ''
  @property({ type: String }) extensionId = ''

  private controller: SettingsController | null = null

  connectedCallback(): void {
    super.connectedCallback()
    this.controller = new SettingsController(() => this.requestUpdate())
    this.controller.connect()
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

    return html`
      <nuxy-scroll-area style="flex: 1; min-height: 0;">
        ${meta.sectionsToRender.map(
          (section) => html`
            <nuxy-section-header
              label=${section.label}
              ${ref((el) => {
                if (this.controller) {
                  this.controller.sectionRefs[section.id] = el as HTMLDivElement | null
                }
              })}
            ></nuxy-section-header>

            <nuxy-list>
              ${section.resolvedRows.map((row, i) => this.renderSettingRow(section, row, i))}
            </nuxy-list>

            ${section.id === 'language'
              ? html`
                  <div style="padding: 2px 12px 10px; font-size: 0.75em; opacity: 0.45;">
                    ${this.controller?.t.t('language.hint')}
                  </div>
                `
              : nothing}
          `
        )}
      </nuxy-scroll-area>
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
            <span style="font-size: 0.75em; opacity: 0.35;">↵ remove</span>
          </nuxy-list-item-actions>
        </nuxy-list-item>
      `
    }

    return html`
      <nuxy-list-item ?active=${isActive} @click=${() => this.controller?.onItemClick(globalIdx)}>
        <nuxy-list-item-body>
          <nuxy-list-item-text>${row.label}</nuxy-list-item-text>
          ${row.isExtension && row.description
            ? html`<span style="font-size: 0.75em; opacity: 0.6;">${row.description}</span>`
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
                    style=${row.type === 'color' ? 'width: 2.5em' : 'width: 10em'}
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
