import { LitElement, html, css, nothing } from 'lit'
import { customElement, state, query } from 'lit/decorators.js'
import type { NuxyToolElement } from '@nuxy/core'
import './MockPanel'

declare const __EXT_NAME__: string

@customElement('nuxy-dev-shell')
export class DevShell extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
      padding: 32px 0 48px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
    }
    .badge-row {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .dev-chip {
      background: rgba(100, 180, 255, 0.15);
      color: #60b4ff;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .window {
      width: 680px;
      height: 500px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      background: var(--bg-base, #141414);
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.7);
    }
    .omnibar {
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
      background: rgba(255, 255, 255, 0.02);
      flex-shrink: 0;
    }
    .omnibar input {
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      color: rgba(255, 255, 255, 0.85);
      font-size: 14px;
      font-family: inherit;
    }
    .loading-hint {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      opacity: 0.3;
    }
    .ext-slot {
      flex: 1;
      min-height: 0;
      display: flex;
      overflow: hidden;
    }
  `

  @state() private query = ''
  @state() private loading = true
  @query('.ext-slot') private extSlot!: HTMLElement

  private toolEl: NuxyToolElement | null = null

  async firstUpdated() {
    await this.mountExtension()
  }

  private async mountExtension() {
    try {
      await import(/* @vite-ignore */ '~ext/frontend.tsx')
      const tag = `nuxy-tool-${__EXT_NAME__}`
      if (!customElements.get(tag)) {
        await customElements.whenDefined(tag)
      }
      const el = document.createElement(tag) as unknown as NuxyToolElement
      el.extensionId = `com.nuxy.${__EXT_NAME__}`
      el.query = this.query
      el.committedQuery = ''
      this.extSlot.appendChild(el as unknown as Node)
      this.toolEl = el
    } catch (err) {
      console.warn('[devshell] Failed to mount extension:', err)
    }
    this.loading = false
  }

  private handleInput(e: Event) {
    this.query = (e.target as HTMLInputElement).value
    if (this.toolEl) this.toolEl.query = this.query
  }

  render() {
    return html`
      <div class="badge-row">
        <span class="dev-chip">DEV</span>
        <span>${__EXT_NAME__}</span>
      </div>
      <div class="window">
        <div class="omnibar">
          <input
            .value=${this.query}
            @input=${this.handleInput}
            placeholder="Search…"
          />
        </div>
        ${this.loading
          ? html`<div class="loading-hint">Loading…</div>`
          : html`<div class="ext-slot"></div>`}
      </div>
      <nuxy-dev-mock-panel></nuxy-dev-mock-panel>
    `
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('loading') && !this.loading && this.toolEl && this.extSlot) {
      if (!this.extSlot.contains(this.toolEl as unknown as Node)) {
        this.extSlot.appendChild(this.toolEl as unknown as Node)
      }
    }
  }
}
