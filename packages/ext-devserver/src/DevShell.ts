import { LitElement, html, css, nothing } from 'lit'
import { customElement, state, query } from 'lit/decorators.js'
import './MockPanel'
import { applyThemeVariables, waitForShellTool } from './dev-env'

declare const __EXT_ID__: string
declare const __EXT_NAME__: string
declare const __USE_REAL_SHELL__: boolean

interface ShellViewElement extends HTMLElement {
  controller?: {
    tools: { tools: Array<{ id: string }> }
    openTool: (id: string) => void
  }
}

@customElement('nuxy-dev-shell')
export class DevShell extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
      padding: 32px 0 48px;
      font-family: inherit;
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
      width: 800px;
      max-width: calc(100vw - 32px);
      min-height: 500px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      background: var(--bg-base, #141414);
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.7);
    }
    .window--shell {
      overflow: visible;
      background: transparent;
      border: none;
      box-shadow: none;
      min-height: 0;
    }
    .window--shell nuxy-shell-view {
      width: 100%;
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
      min-height: 200px;
      opacity: 0.3;
    }
    .ext-slot {
      flex: 1;
      min-height: 0;
      display: flex;
      overflow: hidden;
    }
  `

  @state()
  declare private query: string
  @state()
  declare private loading: boolean
  @state()
  declare private useRealShell: boolean
  @query('.ext-slot') private extSlot!: HTMLElement
  @query('nuxy-shell-view') private shellView!: ShellViewElement

  private toolEl: HTMLElement | null = null

  connectedCallback(): void {
    super.connectedCallback()
    this.query = ''
    this.loading = true
    this.useRealShell = __USE_REAL_SHELL__
    applyThemeVariables(
      (
        window as unknown as {
          __NUXY_DEV_THEME__?: { colors?: Record<string, string>; tokens?: Record<string, string> }
        }
      ).__NUXY_DEV_THEME__ ?? {}
    )
  }

  async firstUpdated() {
    await this.updateComplete
    if (this.useRealShell) {
      await this.mountRealShell()
    } else {
      await this.mountExtensionDirect()
    }
  }

  private async mountRealShell() {
    try {
      await import(/* @vite-ignore */ 'virtual:shell-frontend')
      await import(/* @vite-ignore */ '~ext/frontend.ts')
    } catch (err) {
      console.warn('[devshell] Failed to load shell or extension:', err)
    }
    this.loading = false
    await this.updateComplete
    try {
      await customElements.whenDefined('nuxy-shell-view')
      const shellView = this.shellView
      if (shellView) {
        await waitForShellTool(shellView, __EXT_ID__)
      }
    } catch (err) {
      console.warn('[devshell] Failed to open tool in shell:', err)
    }
  }

  private async mountExtensionDirect() {
    try {
      await import(/* @vite-ignore */ '~ext/frontend.ts')
      const tag = `nuxy-tool-${__EXT_NAME__}`
      if (!customElements.get(tag)) {
        await customElements.whenDefined(tag)
      }
      const el = document.createElement(tag) as HTMLElement & {
        extensionId: string
        query: string
        committedQuery: string
      }
      el.extensionId = __EXT_ID__
      el.query = this.query
      el.committedQuery = ''
      this.toolEl = el
    } catch (err) {
      console.warn('[devshell] Failed to mount extension:', err)
    }
    this.loading = false
  }

  private handleInput(e: Event) {
    this.query = (e.target as HTMLInputElement).value
    const tool = this.toolEl as { query?: string } | null
    if (tool) tool.query = this.query
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && this.toolEl) {
      ;(this.toolEl as { committedQuery?: string }).committedQuery = this.query
    }
  }

  render() {
    return html`
      <div class="badge-row">
        <span class="dev-chip">DEV</span>
        <span>${__EXT_NAME__}</span>
        ${this.useRealShell ? html`<span>· shell</span>` : nothing}
      </div>
      ${this.useRealShell
        ? html`
            <div class="window window--shell">
              ${this.loading
                ? html`<div class="loading-hint">Loading shell…</div>`
                : html`<nuxy-shell-view></nuxy-shell-view>`}
            </div>
          `
        : html`
            <div class="window">
              <div class="omnibar">
                <input
                  .value=${this.query}
                  @input=${this.handleInput}
                  @keydown=${this.handleKeydown}
                  placeholder="Search…"
                />
              </div>
              ${this.loading
                ? html`<div class="loading-hint">Loading…</div>`
                : html`<div class="ext-slot"></div>`}
            </div>
          `}
      <nuxy-dev-mock-panel></nuxy-dev-mock-panel>
    `
  }

  updated(changed: Map<string, unknown>) {
    if (
      !this.useRealShell &&
      changed.has('loading') &&
      !this.loading &&
      this.toolEl &&
      this.extSlot
    ) {
      if (!this.extSlot.contains(this.toolEl)) {
        this.extSlot.appendChild(this.toolEl)
      }
    }
  }
}
