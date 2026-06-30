import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  property,
  ref,
  type PropertyValues,
  type TemplateResult,
} from '@nuxyorg/core'
import type { NuxyToolElement } from '@nuxyorg/core'
import { IpcExplorerController } from './controller.ts'
import type { IpcTarget } from './utils/parse-targets.ts'

const TAG = 'nuxy-tool-ipc-explorer'

@customElement(TAG)
export class NuxyToolIpcExplorerElement extends LitElement implements NuxyToolElement {
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
      height: 100%;
    }

    .ipc-explorer-inner {
      flex: 1;
      min-height: 0;
      height: 100%;
    }

    .ipc-explorer-col {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }

    .ipc-explorer-col nuxy-scroll-area {
      flex: 1;
      min-height: 0;
    }

    .ipc-explorer-col__status {
      flex-shrink: 0;
      padding: 0 var(--space-3);
    }

    .ipc-explorer-panel--centered {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
    }

    .ipc-explorer-payload-col {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
      padding: var(--space-3);
      gap: var(--space-2);
      overflow: hidden;
    }

    .ipc-explorer-payload-input {
      flex: 1;
      min-height: 0;
      width: 100%;
      padding: var(--space-3) var(--space-4);
      background: transparent;
      border: 1px solid var(--syntax-comment);
      border-radius: var(--radius-md);
      color: var(--syntax-variable);
      font-size: var(--font-xs);
      font-family: monospace;
      line-height: 1.5;
      resize: none;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .ipc-explorer-payload-input:focus {
      border-color: var(--syntax-operator);
    }

    .ipc-explorer-payload-meta {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .ipc-explorer-payload-response {
      flex: 1;
      min-height: 0;
      overflow: auto;
    }

    .ipc-explorer-payload-response nuxy-code-block {
      height: 100%;
    }

    nuxy-list-item.ipc-explorer-item--dimmed {
      opacity: 0.45;
    }

    nuxy-list-item.ipc-explorer-item--dimmed[active] {
      opacity: 0.7;
    }
  `

  @property({ type: String })
  declare committedQuery: string

  @property({ type: String })
  declare extensionId: string

  private _query = ''
  private controller: IpcExplorerController | null = null
  private _payloadEl: HTMLTextAreaElement | null = null
  private _lastFocusArea = ''

  set query(value: string) {
    this._query = value ?? ''
  }

  get query(): string {
    return this._query
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.controller = new IpcExplorerController(() => this.requestUpdate())
    this.controller.connect()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.controller?.disconnect()
    this.controller = null
  }

  protected updated(changed: PropertyValues): void {
    super.updated(changed)
    const state = this.controller?.state
    const focusArea = state?.focusArea
    const showingResponse = state?.payloadView === 'response'
    if (focusArea === 'payload' && !showingResponse && this._lastFocusArea !== 'payload') {
      this._payloadEl?.focus()
    }
    if (focusArea === 'payload' && !showingResponse && this._lastPayloadView === 'response') {
      this._payloadEl?.focus()
    }
    if (focusArea !== 'payload' && this._lastFocusArea === 'payload') {
      this._payloadEl?.blur()
    }
    this._lastFocusArea = focusArea ?? ''
    this._lastPayloadView = state?.payloadView ?? 'request'
  }

  private _lastPayloadView = 'request'

  private onPayloadRef = (el: Element | undefined): void => {
    this._payloadEl = (el as HTMLTextAreaElement | null | undefined) ?? null
  }

  private onPayloadInput = (event: Event): void => {
    this.controller?.setPayloadText((event.target as HTMLTextAreaElement).value)
  }

  private onPayloadFocus = (): void => {
    this.controller?.focusPayload()
  }

  private onPayloadKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    this.controller?.leavePayloadPanel()
  }

  private renderTargetItem(
    target: IpcTarget,
    index: number,
    active: boolean,
    controller: IpcExplorerController
  ): TemplateResult {
    const publicCount = target.publicChannels.length
    const channelLabel = publicCount === 1 ? '1 public channel' : `${publicCount} public channels`
    const suffix =
      `${channelLabel}${target.disabled ? ' · disabled' : ''}` +
      (target.extId !== 'kernel' && publicCount === 0 ? ' · not callable' : '')

    const isDimmed = target.extId !== 'kernel' && publicCount === 0

    return html`
      <nuxy-list-item
        class=${isDimmed ? 'ipc-explorer-item--dimmed' : ''}
        ?active=${active}
        @click=${() => controller.selectTargetIndex(index, 'channels')}
      >
        <nuxy-list-item-body>
          <nuxy-list-item-text ?active=${active}>${target.name}</nuxy-list-item-text>
          <nuxy-list-item-meta mono>${target.extId}</nuxy-list-item-meta>
          <nuxy-list-item-meta>${suffix}</nuxy-list-item-meta>
        </nuxy-list-item-body>
      </nuxy-list-item>
    `
  }

  render(): TemplateResult | typeof nothing {
    const controller = this.controller
    if (!controller) return nothing

    const {
      ready,
      loading,
      loadError,
      targets,
      channelIndex,
      focusArea,
      payloadText,
      payloadView,
      resultText,
      invokeError,
    } = controller.state
    const channels = controller.flatChannelsForTarget
    const target = controller.selectedTarget
    const targetIndex = controller.targetIndex
    const showingResponse = payloadView === 'response'

    if (!ready) {
      return html`
        <div class="ipc-explorer-panel--centered">
          <nuxy-loading-state message="Starting IPC Explorer…"></nuxy-loading-state>
        </div>
      `
    }

    return html`
      <nuxy-two-panel min-scale="1/4" default-position="1/4">
        <div class="ipc-explorer-col">
          <nuxy-section-header label="Extensions"></nuxy-section-header>
          <nuxy-scroll-area axis="y">
            <nuxy-list active-index=${focusArea === 'targets' ? targetIndex : -1}>
              ${targets.map((entry, index) =>
                this.renderTargetItem(
                  entry,
                  index,
                  focusArea === 'targets' && index === targetIndex,
                  controller
                )
              )}
            </nuxy-list>
          </nuxy-scroll-area>
        </div>

        <nuxy-two-panel class="ipc-explorer-inner" min-scale="1/3" default-position="2/5">
          <div class="ipc-explorer-col">
            <div class="ipc-explorer-col__status">
              ${loadError ? html`<nuxy-alert variant="danger">${loadError}</nuxy-alert>` : nothing}
              ${loading
                ? html`<nuxy-text size="xs" variant="muted">Loading IPC targets…</nuxy-text>`
                : nothing}
              ${target
                ? html`<nuxy-helper-text>
                    ${target.callable
                      ? 'Callable from worker broker'
                      : 'Renderer invoke only'}${target.extId !== 'kernel' &&
                    target.channels.length === 0
                      ? ' · worker has not synced ipcChannels yet (try Refresh)'
                      : ''}
                  </nuxy-helper-text>`
                : nothing}
            </div>
            <nuxy-section-header label="Channels"></nuxy-section-header>
            <nuxy-scroll-area axis="y">
              ${channels.length > 0
                ? html`
                    <nuxy-list active-index=${focusArea === 'channels' ? channelIndex : -1}>
                      ${channels.map(
                        (entry, idx) => html`
                          <nuxy-list-item
                            class=${entry.scope === 'private' ? 'ipc-explorer-item--dimmed' : ''}
                            ?active=${focusArea === 'channels' && idx === channelIndex}
                            @click=${() => controller.selectChannelIndex(idx, 'channels')}
                          >
                            <nuxy-list-item-body>
                              <nuxy-list-item-text
                                mono
                                ?active=${focusArea === 'channels' && idx === channelIndex}
                                >${entry.channel}</nuxy-list-item-text
                              >
                              <nuxy-list-item-meta>${entry.scope}</nuxy-list-item-meta>
                            </nuxy-list-item-body>
                          </nuxy-list-item>
                        `
                      )}
                    </nuxy-list>
                  `
                : html`<nuxy-text size="xs" variant="muted">No channels</nuxy-text>`}
            </nuxy-scroll-area>
          </div>

          <div class="ipc-explorer-payload-col" @keydown=${this.onPayloadKeydown}>
            ${showingResponse
              ? html`
                  <nuxy-label>Response (JSON)</nuxy-label>
                  <div class="ipc-explorer-payload-response" tabindex="-1">
                    <nuxy-code-block
                      .code=${resultText}
                      language="json"
                      show-copy
                    ></nuxy-code-block>
                  </div>
                `
              : html`
                  <nuxy-label for="payload">Payload (JSON)</nuxy-label>
                  <textarea
                    id="payload"
                    class="ipc-explorer-payload-input"
                    .value=${payloadText}
                    spellcheck="false"
                    ${ref(this.onPayloadRef)}
                    @input=${this.onPayloadInput}
                    @focus=${this.onPayloadFocus}
                    @keydown=${this.onPayloadKeydown}
                  ></textarea>
                `}
            ${target && controller.state.selectedChannel && !controller.canInvokeSelected
              ? html`<div class="ipc-explorer-payload-meta">
                  <nuxy-helper-text variant="error"
                    >Private — not invokable cross-extension</nuxy-helper-text
                  >
                </div>`
              : nothing}
            ${invokeError
              ? html`<div class="ipc-explorer-payload-meta">
                  <nuxy-alert variant="danger">${invokeError}</nuxy-alert>
                </div>`
              : nothing}
          </div>
        </nuxy-two-panel>
      </nuxy-two-panel>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG]: NuxyToolIpcExplorerElement
  }
}
