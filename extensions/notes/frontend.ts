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
    .nuxy-notes-app {
      height: 100%;
    }

    .nuxy-notes-panel-right--edit {
      overflow: hidden;
    }

    .nuxy-notes-panel-right--edit nuxy-markdown-editor {
      flex: 1;
      min-height: 0;
      font-size: var(--nuxy-notes-font-size, 14px);
    }

    .nuxy-notes-panel-right--read {
      padding: var(--space-4);
      overflow-y: auto;
      color: var(--syntax-variable);
      gap: var(--space-2);
    }

    .nuxy-notes-read-content {
      flex: 1;
      opacity: 0.8;
      line-height: 1.5;
      font-size: var(--nuxy-notes-font-size, 14px);
    }
  `
  @property({ type: String })
  declare committedQuery: string
  @property({ type: String })
  declare extensionId: string

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
    this.style.setProperty('--nuxy-notes-font-size', s.fontSize || '14px')
    return html`
      <div class="nuxy-notes-app">
        <nuxy-two-panel ?hide-left=${s.editMode}>
          ${this.renderLeftPanel()} ${this.renderRightPanel()}
        </nuxy-two-panel>
      </div>
    `
  }

  private renderLeftPanel(): TemplateResult {
    const { filteredNotes, selectedIndex, query } = this.controller!.state
    return html`
      <div class="nuxy-two-panel__left">
        <nuxy-section-header label="Notes"></nuxy-section-header>
        <nuxy-list active-index=${selectedIndex}>
          <nuxy-list-item
            .active=${selectedIndex === 0}
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
                    .active=${idx + 1 === selectedIndex}
                    @click=${() => this.controller?.setSelectedIndex(idx + 1)}
                  >
                    <nuxy-list-item-body>
                      <nuxy-list-item-text>${note.title}</nuxy-list-item-text>
                      <nuxy-list-item-meta>${(note.body ?? '').slice(0, 60)}</nuxy-list-item-meta>
                    </nuxy-list-item-body>
                  </nuxy-list-item>
                `
              )}
        </nuxy-list>
      </div>
    `
  }

  private renderRightPanel(): TemplateResult | typeof nothing {
    const { selected, body, editMode, transcribing } = this.controller!.state

    if (editMode && selected) {
      return html`
        <div class="nuxy-two-panel__right nuxy-notes-panel-right--edit">
          <nuxy-markdown-editor
            .value=${body}
            placeholder=${transcribing ? 'Transcribing…' : 'Start writing…'}
            ${ref((el) => {
              const editor = el as
                | (HTMLElement & { nativeTextarea?: HTMLTextAreaElement | null })
                | null
                | undefined
              this.controller!.textareaRef.current = editor?.nativeTextarea ?? null
            })}
            @input=${(e: Event) => {
              const editor = e.currentTarget as HTMLElement & { value: string }
              this.controller?.setBody(editor.value)
            }}
          ></nuxy-markdown-editor>
        </div>
      `
    }

    if (selected) {
      return html`
        <div class="nuxy-two-panel__right nuxy-notes-panel-right--read">
          <div class="nuxy-notes-read-content">
            <nuxy-markdown-text content=${selected.body}></nuxy-markdown-text>
          </div>
        </div>
      `
    }

    return html`
      <div class="nuxy-two-panel__right">
        <nuxy-empty-state
          message="Select a note or create a new one."
          hint="Use ⌃N to create a new note."
        ></nuxy-empty-state>
      </div>
    `
  }
}
