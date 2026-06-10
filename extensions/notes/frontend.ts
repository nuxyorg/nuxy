import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  property,
  ref,
  type TemplateResult,
} from '@nuxy/core'
import type { NuxyToolElement } from '@nuxy/core'
import { NotesController } from './controller.ts'

@customElement('nuxy-tool-notes')
export class NuxyToolNotesElement extends LitElement implements NuxyToolElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .nuxy-notes-app {
      height: 100%;
    }

    .nuxy-notes-edit-mode .nuxy-two-panel__left {
      display: none !important;
    }
  `
  @property({ type: String }) committedQuery = ''
  @property({ type: String }) extensionId = ''

  private controller: NotesController | null = null
  private _query = ''

  connectedCallback(): void {
    super.connectedCallback()
    this.controller = new NotesController(() => this.requestUpdate())
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

  render(): TemplateResult | typeof nothing {
    if (!this.controller) return nothing
    const s = this.controller.state
    return html`
      <div class="nuxy-notes-app${s.editMode ? ' nuxy-notes-edit-mode' : ''}">
        <nuxy-two-panel> ${this.renderLeftPanel()} ${this.renderRightPanel()} </nuxy-two-panel>
      </div>
    `
  }

  private renderLeftPanel(): TemplateResult {
    const { filteredNotes, selectedIndex, query } = this.controller!.state
    return html`
      <div>
        <nuxy-section-header label="Notes"></nuxy-section-header>
        <nuxy-list>
          <nuxy-list-item
            ?active=${selectedIndex === 0}
            @click=${() => this.controller?.setSelectedIndex(0)}
          >
            <nuxy-list-item-body>
              <nuxy-list-item-text>New Note</nuxy-list-item-text>
              <nuxy-list-item-meta>Create a new note</nuxy-list-item-meta>
            </nuxy-list-item-body>
          </nuxy-list-item>
          ${filteredNotes.length === 0
            ? html`
                <nuxy-empty-state
                  message=${query ? 'No matching notes.' : 'No notes yet.'}
                  hint="Use ⌃N to create a new note."
                ></nuxy-empty-state>
              `
            : filteredNotes.map(
                (note, idx) => html`
                  <nuxy-list-item
                    ?active=${idx + 1 === selectedIndex}
                    @click=${() => this.controller?.setSelectedIndex(idx + 1)}
                  >
                    <nuxy-list-item-body>
                      <nuxy-list-item-text>${note.title}</nuxy-list-item-text>
                      <nuxy-list-item-meta>${note.body.slice(0, 60)}</nuxy-list-item-meta>
                    </nuxy-list-item-body>
                  </nuxy-list-item>
                `
              )}
        </nuxy-list>
      </div>
    `
  }

  private renderRightPanel(): TemplateResult | typeof nothing {
    const { selected, body, editMode, transcribing, fontSize } = this.controller!.state

    if (editMode && selected) {
      return html`
        <div
          style="display: flex; flex-direction: column; height: 100%; padding: var(--space-2); gap: var(--space-2);"
        >
          <textarea
            class="nuxy-textarea"
            placeholder=${transcribing ? 'Transcribing…' : 'Start writing…'}
            .value=${body}
            style="flex: 1; resize: none; width: 100%; height: 100%; border: none; background: transparent; color: var(--text, #ffffff); outline: none; padding: var(--space-4, 12px); font-size: ${fontSize};"
            ${ref((el) => {
              this.controller!.textareaRef.current = (el as HTMLTextAreaElement) ?? null
            })}
            @input=${(e: Event) =>
              this.controller?.setBody((e.target as HTMLTextAreaElement).value)}
          ></textarea>
        </div>
      `
    }

    if (selected) {
      return html`
        <div
          style="display: flex; flex-direction: column; height: 100%; padding: var(--space-4, 12px); overflow-y: auto; color: var(--text, #ffffff); gap: var(--space-2);"
        >
          <div
            style="font-size: 1.2em; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;"
          >
            ${selected.title}
          </div>
          <div
            style="flex: 1; white-space: pre-wrap; opacity: 0.8; font-size: ${fontSize}; line-height: 1.5;"
          >
            <nuxy-markdown-text>${selected.body}</nuxy-markdown-text>
          </div>
        </div>
      `
    }

    return html`
      <nuxy-empty-state
        message="Select a note or create a new one."
        hint="Use ⌃N to create a new note."
      ></nuxy-empty-state>
    `
  }
}
