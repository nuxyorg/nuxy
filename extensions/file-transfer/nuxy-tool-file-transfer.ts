import {
  LitElement,
  html,
  nothing,
  customElement,
  property,
  type TemplateResult,
} from '@nuxyorg/core'
import type { NuxyToolElement } from '@nuxyorg/core'
import { FileTransferController } from './controller.ts'
import { formatBytes, formatEta, formatSpeed } from './utils/transfer-stats.ts'

@customElement('nuxy-tool-file-transfer')
export class NuxyToolFileTransferElement extends LitElement implements NuxyToolElement {
  protected createRenderRoot(): HTMLElement {
    return this
  }

  @property({ type: String })
  declare committedQuery: string
  @property({ type: String })
  declare extensionId: string

  private controller: FileTransferController | null = null
  private _query = ''

  connectedCallback(): void {
    super.connectedCallback()
    this.style.display = 'flex'
    this.style.flexDirection = 'column'
    this.style.flex = '1'
    this.style.minHeight = '0'
    this.style.height = '100%'
    this.style.overflow = 'hidden'
    this.controller = new FileTransferController(() => this.requestUpdate())
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

    if (s.mode === 'menu') return this.renderMenu()
    if (s.mode === 'send') return this.renderSend()
    return this.renderReceive()
  }

  private panelStyle(): string {
    return [
      'display:flex',
      'flex-direction:column',
      'gap:var(--space-4)',
      'padding:var(--space-5)',
      'flex:1',
      'min-height:0',
      'overflow:auto',
    ].join(';')
  }

  private renderMenu(): TemplateResult {
    const t = this.controller!.t.t
    const idx = this.controller!.state.menuIndex
    const items = [
      { id: 'send', label: t('menu.send'), hint: t('menu.sendHint') },
      { id: 'receive', label: t('menu.receive'), hint: t('menu.receiveHint') },
    ]

    return html`
      <div style=${this.panelStyle()}>
        <nuxy-section-header label=${t('menu.title')}></nuxy-section-header>
        <nuxy-list active-index=${idx}>
          ${items.map(
            (item, i) => html`
              <nuxy-list-item ?active=${i === idx} @click=${() => this.controller?.setMenuIndex(i)}>
                <nuxy-list-item-body>
                  <nuxy-list-item-text ?active=${i === idx}>${item.label}</nuxy-list-item-text>
                  <nuxy-list-item-meta>${item.hint}</nuxy-list-item-meta>
                </nuxy-list-item-body>
              </nuxy-list-item>
            `
          )}
        </nuxy-list>
      </div>
    `
  }

  private renderSend(): TemplateResult {
    const t = this.controller!.t.t
    const s = this.controller!.state

    if (s.phase === 'error') {
      return html`
        <div style=${this.panelStyle()}>
          <nuxy-alert variant="error">${s.error}</nuxy-alert>
        </div>
      `
    }

    if (s.phase === 'done') {
      return html`
        <div style=${this.panelStyle()}>
          <nuxy-alert variant="success">${t('send.done')}</nuxy-alert>
          ${this.renderProgress()}
        </div>
      `
    }

    if (s.phase === 'waiting' || s.phase === 'connecting' || s.phase === 'transferring') {
      return html`
        <div style=${this.panelStyle()}>
          <nuxy-section-header label=${t('send.activeTitle')}></nuxy-section-header>
          <nuxy-properties-panel
            title=${t('send.codeTitle')}
            rows=${JSON.stringify([
              { label: t('send.codeLabel'), value: s.transferCode },
              { label: t('send.fileLabel'), value: s.selectedFile?.name ?? '—' },
              { label: t('send.sizeLabel'), value: formatBytes(s.selectedFile?.size ?? 0) },
            ])}
          ></nuxy-properties-panel>
          <nuxy-text size="xs" variant="muted">${t('send.waitingHint')}</nuxy-text>
          ${this.renderProgress()}
        </div>
      `
    }

    const sendItems = s.selectedFile
      ? [
          { label: s.selectedFile.name, hint: formatBytes(s.selectedFile.size) },
          { label: t('send.startItem'), hint: t('send.startHint') },
        ]
      : [{ label: t('send.pickItem'), hint: t('send.pickHint') }]

    return html`
      <div style=${this.panelStyle()}>
        <nuxy-section-header label=${t('send.title')}></nuxy-section-header>
        <nuxy-list active-index=${0}>
          ${sendItems.map(
            (item, i) => html`
              <nuxy-list-item ?active=${i === 0}>
                <nuxy-list-item-body>
                  <nuxy-list-item-text ?active=${i === 0}>${item.label}</nuxy-list-item-text>
                  <nuxy-list-item-meta>${item.hint}</nuxy-list-item-meta>
                </nuxy-list-item-body>
              </nuxy-list-item>
            `
          )}
        </nuxy-list>
      </div>
    `
  }

  private renderReceive(): TemplateResult {
    const t = this.controller!.t.t
    const s = this.controller!.state

    if (s.phase === 'error') {
      return html`
        <div style=${this.panelStyle()}>
          <nuxy-alert variant="error">${s.error}</nuxy-alert>
        </div>
      `
    }

    if (s.phase === 'done') {
      return html`
        <div style=${this.panelStyle()}>
          <nuxy-alert variant="success">${t('receive.done')}</nuxy-alert>
          <nuxy-properties-panel
            title=${t('receive.savedTitle')}
            rows=${JSON.stringify([{ label: t('receive.pathLabel'), value: s.savedPath ?? '—' }])}
          ></nuxy-properties-panel>
          ${this.renderProgress()}
        </div>
      `
    }

    if (s.phase === 'connecting' || s.phase === 'transferring') {
      return html`
        <div style=${this.panelStyle()}>
          <nuxy-section-header label=${t('receive.activeTitle')}></nuxy-section-header>
          <nuxy-text size="sm">${t('receive.connectingTo', { code: s.transferCode })}</nuxy-text>
          ${this.renderProgress()}
        </div>
      `
    }

    return html`
      <div style=${this.panelStyle()}>
        <nuxy-section-header label=${t('receive.title')}></nuxy-section-header>
        <nuxy-empty-state
          message=${t('receive.prompt')}
          hint=${t('receive.hint')}
        ></nuxy-empty-state>
        ${s.query.trim()
          ? html`
              <nuxy-text size="sm" variant="accent"
                >${t('receive.enteredCode', { code: s.query.trim().toUpperCase() })}</nuxy-text
              >
            `
          : nothing}
      </div>
    `
  }

  private renderProgress(): TemplateResult | typeof nothing {
    const s = this.controller!.state
    const t = this.controller!.t.t
    if (s.progress.totalBytes <= 0 && s.phase !== 'done') return nothing

    const pct =
      s.progress.totalBytes > 0
        ? Math.round((s.progress.bytesTransferred / s.progress.totalBytes) * 100)
        : 100

    return html`
      <nuxy-progress-bar
        value=${pct}
        max="100"
        label=${t('progress.label')}
        show-value
      ></nuxy-progress-bar>
      <nuxy-properties-panel
        title=${t('progress.details')}
        rows=${JSON.stringify([
          {
            label: t('progress.transferred'),
            value: `${formatBytes(s.progress.bytesTransferred)} / ${formatBytes(s.progress.totalBytes)}`,
          },
          { label: t('progress.speed'), value: formatSpeed(s.progress.speedBps) },
          { label: t('progress.eta'), value: formatEta(s.progress.etaSeconds) },
        ])}
      ></nuxy-properties-panel>
    `
  }
}
