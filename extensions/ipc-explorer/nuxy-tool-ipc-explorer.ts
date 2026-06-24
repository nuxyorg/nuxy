import { LitElement, html, css, nothing, customElement, property } from '@nuxyorg/core'
import type { NuxyToolElement } from '@nuxyorg/core'
import { IpcExplorerController } from './controller.ts'

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

    .panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-4);
      min-height: 0;
      overflow: auto;
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: center;
    }

    label {
      display: block;
      font-size: var(--font-xs);
      color: var(--color-text-muted, rgba(255, 255, 255, 0.55));
      min-width: 4.5rem;
      margin-bottom: var(--space-1);
    }

    select,
    textarea,
    button {
      font: inherit;
      color: var(--color-text, inherit);
      background: var(--color-surface-2, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
      border-radius: var(--radius-sm, 6px);
    }

    select {
      width: 100%;
      padding: var(--space-2);
    }

    textarea {
      width: 100%;
      min-height: 6rem;
      padding: var(--space-2);
      font-family: var(--font-mono, monospace);
      font-size: var(--font-xs);
      resize: vertical;
      box-sizing: border-box;
    }

    button {
      padding: var(--space-2) var(--space-3);
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .channels {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
    }

    .chip {
      padding: 2px 8px;
      border-radius: 999px;
      font-size: var(--font-xs);
      background: var(--color-surface-2, rgba(255, 255, 255, 0.08));
      border: 1px solid transparent;
      cursor: pointer;
    }

    .chip.active {
      border-color: var(--color-accent, #6ea8fe);
    }

    .chip.public {
      border-color: var(--color-success, #4caf50);
    }

    .chip.private {
      opacity: 0.7;
    }

    .channel-group-label {
      font-size: var(--font-xs);
      color: var(--color-text-muted, rgba(255, 255, 255, 0.55));
      margin-top: var(--space-1);
    }

    .meta {
      font-size: var(--font-xs);
      color: var(--color-text-muted, rgba(255, 255, 255, 0.55));
    }

    .result {
      margin: 0;
      padding: var(--space-3);
      border-radius: var(--radius-sm, 6px);
      background: rgba(0, 0, 0, 0.25);
      font-family: var(--font-mono, monospace);
      font-size: var(--font-xs);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 16rem;
      overflow: auto;
    }

    .error {
      color: var(--color-danger, #ff6b6b);
    }
  `

  @property({ type: String })
  declare committedQuery: string

  @property({ type: String })
  declare extensionId: string

  private _query = ''
  private controller: IpcExplorerController | null = null

  protected createRenderRoot(): HTMLElement {
    return this
  }

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
    this.controller = null
  }

  private onExtChange = (event: Event): void => {
    this.controller?.selectExtension((event.target as HTMLSelectElement).value)
  }

  private onChannelChange = (event: Event): void => {
    this.controller?.selectChannel((event.target as HTMLSelectElement).value)
  }

  private onPayloadInput = (event: Event): void => {
    this.controller?.setPayloadText((event.target as HTMLTextAreaElement).value)
  }

  render() {
    const controller = this.controller
    if (!controller) return nothing

    const {
      ready,
      loading,
      loadError,
      targets,
      selectedExtId,
      selectedChannel,
      payloadText,
      invoking,
      resultText,
      invokeError,
    } = controller.state
    const target = controller.selectedTarget
    const extensionsWithChannels = targets.filter(
      (t) => t.extId !== 'kernel' && t.channels.length > 0
    )

    return html`
      <div class="panel">
        <div class="row">
          <button type="button" ?disabled=${loading} @click=${() => controller.refreshTargets()}>
            Refresh
          </button>
          <span class="meta">
            ${loading
              ? 'Loading IPC targets…'
              : `${targets.length} targets · ${extensionsWithChannels.length} extensions with channels`}
          </span>
        </div>

        ${loadError ? html`<div class="error">${loadError}</div>` : nothing}
        ${!ready
          ? html`<div class="meta">Starting IPC Explorer…</div>`
          : html`
              <div>
                <label for="ext-select">Target</label>
                <select id="ext-select" .value=${selectedExtId} @change=${this.onExtChange}>
                  ${targets.map(
                    (t) => html`
                      <option value=${t.extId}>
                        ${t.name} (${t.extId}) · ${t.channels.length} ch
                        ${t.disabled ? ' [disabled]' : ''}
                        ${t.extId !== 'kernel' && t.channels.length === 0
                          ? ' [no channels yet]'
                          : ''}
                      </option>
                    `
                  )}
                </select>
              </div>

              ${target
                ? html`
                    <div class="meta">
                      ${target.callable ? 'callable from worker broker' : 'renderer invoke only'}
                      ${target.extId !== 'kernel' && target.channels.length === 0
                        ? ' · worker has not synced ipcChannels yet (try Refresh)'
                        : nothing}
                    </div>
                    ${target.publicChannels.length > 0
                      ? html`
                          <div class="channel-group-label">Public (cross-extension)</div>
                          <div class="channels">
                            ${target.publicChannels.map(
                              (channel) => html`
                                <button
                                  type="button"
                                  class="chip public ${channel === selectedChannel ? 'active' : ''}"
                                  @click=${() => controller.selectChannel(channel)}
                                >
                                  ${channel}
                                </button>
                              `
                            )}
                          </div>
                        `
                      : nothing}
                    ${target.privateChannels.length > 0
                      ? html`
                          <div class="channel-group-label">Private (own extension only)</div>
                          <div class="channels">
                            ${target.privateChannels.map(
                              (channel) => html`
                                <button
                                  type="button"
                                  class="chip private ${channel === selectedChannel
                                    ? 'active'
                                    : ''}"
                                  @click=${() => controller.selectChannel(channel)}
                                >
                                  ${channel}
                                </button>
                              `
                            )}
                          </div>
                        `
                      : nothing}
                  `
                : nothing}

              <div>
                <label for="channel-select">Channel</label>
                <select
                  id="channel-select"
                  .value=${selectedChannel}
                  ?disabled=${!target || target.channels.length === 0}
                  @change=${this.onChannelChange}
                >
                  ${(target?.channels ?? []).map(
                    (channel) => html`<option value=${channel}>${channel}</option>`
                  )}
                </select>
              </div>

              <div>
                <label for="payload">Payload (JSON)</label>
                <textarea
                  id="payload"
                  .value=${payloadText}
                  @input=${this.onPayloadInput}
                  spellcheck="false"
                ></textarea>
              </div>

              <div class="row">
                <button
                  type="button"
                  ?disabled=${invoking || !controller.canInvokeSelected}
                  @click=${() => controller.invokeSelected()}
                >
                  ${invoking ? 'Invoking…' : 'Invoke'}
                </button>
                ${target && selectedChannel && !controller.canInvokeSelected
                  ? html`<span class="meta error">Private — not invokable cross-extension</span>`
                  : nothing}
              </div>

              ${invokeError ? html`<div class="error">${invokeError}</div>` : nothing}
              ${resultText ? html`<pre class="result">${resultText}</pre>` : nothing}
            `}
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG]: NuxyToolIpcExplorerElement
  }
}
