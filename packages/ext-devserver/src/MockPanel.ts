import { LitElement, html, css, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { ipcLog, runtimeMocks, setMock, clearMock, type LogEntry } from './mock-core'

interface MockRowState {
  channel: string
  draft: string
  error: string
  applied: boolean
}

@customElement('nuxy-dev-mock-panel')
export class MockPanel extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 680px;
      background: #0e0e16;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 8px;
      overflow: hidden;
      font-family: ui-monospace, 'Cascadia Code', monospace;
      font-size: 12px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      cursor: pointer;
      user-select: none;
    }
    .header-left {
      color: rgba(255, 255, 255, 0.5);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .active-badge {
      color: #60b4ff;
      font-size: 10px;
      background: rgba(80, 160, 255, 0.12);
      padding: 1px 6px;
      border-radius: 10px;
    }
    .header-right {
      color: rgba(255, 255, 255, 0.25);
      font-size: 10px;
    }
    .body {
      display: contents;
    }
    .empty {
      padding: 16px 12px;
      color: rgba(255, 255, 255, 0.2);
      text-align: center;
    }
    .row {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding: 8px 12px;
    }
    .row-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 5px;
    }
    .channel-name {
      font-weight: 600;
    }
    .channel-name.active {
      color: #60b4ff;
    }
    .channel-name.inactive {
      color: rgba(255, 255, 255, 0.45);
    }
    .ts-label {
      color: rgba(255, 255, 255, 0.2);
      font-size: 10px;
    }
    .source-badge {
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 3px;
    }
    .applied-badge {
      color: #60b4ff;
      font-size: 10px;
      background: rgba(80, 160, 255, 0.1);
      padding: 1px 5px;
      border-radius: 3px;
    }
    .spacer {
      flex: 1;
    }
    textarea {
      width: 100%;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: #d4e0f0;
      font-family: inherit;
      font-size: 11px;
      padding: 5px 8px;
      resize: vertical;
      min-height: 52px;
      outline: none;
      box-sizing: border-box;
    }
    textarea.has-error {
      border-color: rgba(255, 80, 80, 0.4);
    }
    textarea.is-applied {
      border-color: rgba(80, 160, 255, 0.25);
    }
    .hint {
      margin-top: 3px;
      font-size: 10px;
    }
    .hint.error {
      color: #ff7070;
    }
    .hint.info {
      color: rgba(255, 255, 255, 0.2);
    }
    .add-row {
      display: flex;
      gap: 6px;
      padding: 8px 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      align-items: center;
    }
    .add-input {
      flex: 1;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: #d4e0f0;
      font-family: inherit;
      font-size: 11px;
      padding: 4px 8px;
      outline: none;
    }
    button {
      padding: 2px 8px;
      border-radius: 3px;
      border: none;
      cursor: pointer;
      font-size: 10px;
      font-family: inherit;
      font-weight: 600;
    }
    button.btn-apply {
      background: rgba(80, 160, 255, 0.2);
      color: #60b4ff;
    }
    button.btn-clear {
      background: rgba(255, 80, 80, 0.15);
      color: #ff7070;
    }
    button.btn-add {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.6);
    }
    button:disabled {
      opacity: 0.4;
    }
  `

  @state() private open = true
  @state() private channels: string[] = []
  @state() private newChannel = ''
  @state() private rowStates = new Map<string, MockRowState>()
  @state() private tick = 0

  private pollInterval?: ReturnType<typeof setInterval>

  connectedCallback() {
    super.connectedCallback()
    this.pollInterval = setInterval(() => this.syncChannels(), 800)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    clearInterval(this.pollInterval)
  }

  private syncChannels() {
    const seen = new Set(this.channels)
    for (const e of ipcLog) {
      if (e.extId !== 'kernel') seen.add(e.channel)
    }
    for (const k of Object.keys(runtimeMocks)) seen.add(k)
    const next = [...seen]
    if (next.length !== this.channels.length || next.some((c, i) => c !== this.channels[i])) {
      this.channels = next
    }
    this.tick++
  }

  private getRowState(channel: string): MockRowState {
    if (!this.rowStates.has(channel)) {
      const isActive = Object.prototype.hasOwnProperty.call(runtimeMocks, channel)
      const lastEntry = [...ipcLog].reverse().find((e) => e.channel === channel)
      const initialJson = isActive
        ? JSON.stringify(runtimeMocks[channel], null, 2)
        : lastEntry !== undefined
          ? JSON.stringify(lastEntry.data, null, 2)
          : ''
      this.rowStates.set(channel, {
        channel,
        draft: initialJson,
        error: '',
        applied: isActive,
      })
    }
    return this.rowStates.get(channel)!
  }

  private applyMock(channel: string) {
    const row = this.getRowState(channel)
    try {
      const parsed = JSON.parse(row.draft)
      setMock(channel, parsed)
      row.error = ''
      row.applied = true
      this.rowStates = new Map(this.rowStates)
    } catch {
      row.error = 'Invalid JSON'
      this.rowStates = new Map(this.rowStates)
    }
  }

  private removeMock(channel: string) {
    clearMock(channel)
    const row = this.getRowState(channel)
    row.applied = false
    this.rowStates.set(channel, { ...row })
    this.channels = this.channels.filter((c) => c !== channel)
    this.rowStates.delete(channel)
    this.rowStates = new Map(this.rowStates)
  }

  private updateDraft(channel: string, value: string) {
    const row = this.getRowState(channel)
    row.draft = value
    row.error = ''
    this.rowStates = new Map(this.rowStates)
  }

  private getLastEntry(channel: string): LogEntry | undefined {
    return [...ipcLog].reverse().find((e) => e.channel === channel)
  }

  private sourceBadge(source: string) {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      ui: { label: 'ui', color: '#60b4ff', bg: 'rgba(80,160,255,0.15)' },
      backend: { label: 'backend', color: '#7be07b', bg: 'rgba(80,200,80,0.12)' },
      file: { label: 'file', color: '#f0b860', bg: 'rgba(240,184,80,0.12)' },
      null: { label: 'null', color: '#ff7070', bg: 'rgba(255,80,80,0.1)' },
    }
    const b = map[source] ?? map['null']
    return html`<span
      class="source-badge"
      style="color:${b.color};background:${b.bg}"
      >${b.label}</span
    >`
  }

  private renderRow(channel: string) {
    const row = this.getRowState(channel)
    const lastEntry = this.getLastEntry(channel)
    const hasChanges = row.applied
      ? JSON.stringify(runtimeMocks[channel], null, 2) !== row.draft
      : row.draft !== ''

    return html`
      <div class="row">
        <div class="row-header">
          <span class="channel-name ${row.applied ? 'active' : 'inactive'}">${channel}</span>
          ${lastEntry
            ? html`
                <span class="ts-label">${new Date(lastEntry.ts).toLocaleTimeString()}</span>
                ${this.sourceBadge(lastEntry.source)}
              `
            : nothing}
          ${row.applied ? html`<span class="applied-badge">active</span>` : nothing}
          <span class="spacer"></span>
          <button class="btn-clear" @click=${() => this.removeMock(channel)}>remove</button>
          <button class="btn-apply" ?disabled=${!hasChanges} @click=${() => this.applyMock(channel)}>
            apply
          </button>
        </div>
        <textarea
          class="${row.error ? 'has-error' : row.applied ? 'is-applied' : ''}"
          .value=${row.draft}
          rows=${Math.min(8, Math.max(2, row.draft.split('\n').length))}
          @input=${(e: Event) => this.updateDraft(channel, (e.target as HTMLTextAreaElement).value)}
          @keydown=${(e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') this.applyMock(channel)
          }}
          spellcheck="false"
        ></textarea>
        ${row.error
          ? html`<div class="hint error">${row.error}</div>`
          : html`<div class="hint info">Ctrl+Enter to apply</div>`}
      </div>
    `
  }

  private addChannel() {
    const ch = this.newChannel.trim()
    if (!ch || this.channels.includes(ch)) return
    this.channels = [...this.channels, ch]
    this.newChannel = ''
  }

  render() {
    const activeCount = Object.keys(runtimeMocks).length

    return html`
      <div class="header" @click=${() => (this.open = !this.open)}>
        <span class="header-left">
          ${this.open ? '▼' : '▶'} Mocks
          ${activeCount > 0 ? html`<span class="active-badge">${activeCount} active</span>` : nothing}
        </span>
        <span class="header-right">
          ${this.channels.length} channel${this.channels.length !== 1 ? 's' : ''} seen
        </span>
      </div>
      ${this.open
        ? html`
            <div class="body">
              ${this.channels.length === 0
                ? html`<div class="empty">No IPC calls yet — interact with the extension above.</div>`
                : nothing}
              ${repeat(this.channels, (ch) => ch, (ch) => this.renderRow(ch))}
              <div class="add-row">
                <input
                  class="add-input"
                  placeholder="channel name (e.g. getHistory)"
                  .value=${this.newChannel}
                  @input=${(e: Event) =>
                    (this.newChannel = (e.target as HTMLInputElement).value)}
                  @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.addChannel()}
                />
                <button class="btn-add" @click=${this.addChannel}>+ add</button>
              </div>
            </div>
          `
        : nothing}
    `
  }
}
