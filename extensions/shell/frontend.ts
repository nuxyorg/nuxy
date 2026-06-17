import {
  LitElement,
  html,
  nothing,
  customElement,
  css,
  query as queryDecorator,
  ref,
  createRef,
} from '@nuxyorg/core'
import { ShellController } from './controller.ts'
import './nuxy-shell.ts'
import './nuxy-portal-host.ts'
import './nuxy-shell-resize-handles.ts'
import './nuxy-shell-omni-bar.ts'
import './nuxy-command-palette.ts'
import type { CommandPaletteAction, HoldProgress, KeyAction, ProviderState } from './types.ts'
import type { OmnibarSection } from './utils/listResults.ts'

function holdTargetMatches(action: KeyAction, holdProgress: HoldProgress | null): boolean {
  if (!holdProgress || action.trigger !== 'hold') return false
  const actionHint = action.hint ?? action.key
  const normalize = (hint: string | string[]) =>
    (Array.isArray(hint) ? hint.join('+') : hint).toLowerCase()
  return normalize(actionHint) === normalize(holdProgress.hint)
}

interface ResultItem {
  id: string
  title: string
  value?: string
  meta?: {
    left?: { text: string; badge: string }
    right?: { text: string; badge: string }
  }
}

function createToolHost(ctrl: ShellController): HTMLElement & {
  extensionId: string
  query: string
  committedQuery: string
} {
  const Ctor = customElements.get('nuxy-tool-host') as CustomElementConstructor | undefined
  if (!Ctor) {
    throw new Error('nuxy-tool-host is not registered')
  }
  const host = new Ctor() as HTMLElement & {
    extensionId: string
    query: string
    committedQuery: string
  }
  host.extensionId = ctrl.state.activeTool ?? ''
  host.query = ctrl.state.query
  host.committedQuery = ctrl.state.savedQuery
  host.setAttribute('loading-message', ctrl.t.t('loading'))
  return host
}

@customElement('nuxy-shell-view')
export class NuxyShellViewElement extends LitElement {
  static styles = css`
    @keyframes nuxy-slide-fade-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes nuxy-fade-in-up {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .nuxy-shell-backdrop {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background-color: transparent;
      z-index: var(--z-backdrop);
    }

    .nuxy-main-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      justify-content: space-between;
      background-color: var(--bg-base);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-radius: calc(var(--radius-xl) - 2px);
      z-index: 1;
    }

    .nuxy-shell-body {
      width: 100%;
      color: var(--syntax-variable);
      display: flex;
      flex-direction: column;
      min-height: 0;
      flex: 1;
    }

    .nuxy-shell-results-panel {
      border-top: 1px solid var(--syntax-comment);
      overflow-y: auto;
      flex: 0 1 auto;
      min-height: 0;
      scrollbar-width: thin;
      scrollbar-color: var(--scrollbar-thumb, rgba(255, 255, 255, 0.15)) transparent;
    }

    .nuxy-zone {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 350ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .nuxy-zone[data-visible] {
      grid-template-rows: 1fr;
    }

    .nuxy-zone-inner {
      overflow: hidden;
      min-height: 0;
    }

    .nuxy-zone[data-visible] + .nuxy-zone[data-visible],
    .nuxy-zone[data-visible] + .nuxy-shell-results-section,
    .nuxy-shell-results-section + .nuxy-zone[data-visible] {
      border-top: 1px solid var(--syntax-comment);
    }

    .nuxy-shell-results-section + .nuxy-shell-results-section {
      border-top: 1px solid var(--syntax-comment);
    }

    .nuxy-shell-results-section__body {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: 0 var(--space-5) var(--space-2);
    }

    .nuxy-shell-results-section__skeletons {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: 0 var(--space-5) var(--space-3);
    }

    .nuxy-shell-tool-loading {
      color: var(--syntax-variable);
      padding: var(--space-4) var(--space-5);
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      font-size: var(--font-md);
    }

    .nuxy-shell-tool-wrapper {
      border-top: 1px solid var(--syntax-comment);
      flex: 1;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: nuxy-slide-fade-in 250ms cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: top;
    }

    .nuxy-shell-footer {
      position: relative;
      flex-shrink: 0;
    }

    .nuxy-shell-footer nuxy-shortcut-bar {
      justify-content: space-between;
    }

    @media (prefers-reduced-motion: reduce) {
      .nuxy-shell-tool-loading {
        animation: none;
      }
    }
  `

  private controller: ShellController | null = null
  private toolHostEl:
    | (HTMLElement & {
        extensionId: string
        query: string
        committedQuery: string
      })
    | null = null
  private lastActiveTool: string | null = null
  private _inputEl: HTMLInputElement | null = null
  private _didInitialPosition = false
  private readonly _shellRef = createRef<HTMLElement>()

  @queryDecorator('nuxy-shell-omni-bar')
  private omniBarEl!: HTMLElement & { nativeInput?: HTMLInputElement }

  @queryDecorator('nuxy-command-palette')
  private commandPaletteEl!: (HTMLElement & { nativeInput?: HTMLInputElement | null }) | null

  connectedCallback(): void {
    super.connectedCallback()
    if (this.controller) return
    this.controller = new ShellController(() => this.requestUpdate())
    this.controller.connect()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.controller?.disconnect()
    this.controller = null
    this._inputEl = null
    this._didInitialPosition = false
  }

  protected updated(): void {
    const ctrl = this.controller
    if (!ctrl) return
    const s = ctrl.state

    ctrl.refs.container = this._shellRef.value ?? null
    if (ctrl.refs.container && !this._didInitialPosition) {
      this._didInitialPosition = true
      ctrl.onContainerReady()
    }

    const omniEl = this.omniBarEl
    if (omniEl) {
      const input = omniEl.nativeInput ?? null
      this._inputEl = input
      ctrl.refs.input = input
      if (input && input.value !== s.query) {
        input.value = s.query
      }
      const placeholder = ctrl.resolveOmniBarPlaceholder()
      if (input && input.placeholder !== placeholder) {
        input.placeholder = placeholder
      }
      if (!s.showCommandPalette) {
        ctrl.ensureShellFocus()
      }
      ctrl.bindOmniBarInput(input)
    }

    ctrl.refs.commandPaletteInput = this.commandPaletteEl?.nativeInput ?? null
  }

  private renderOmniBar() {
    const ctrl = this.controller
    if (!ctrl) return nothing
    const { query, showOmniBar, bridge } = ctrl.state
    const activeToolName = ctrl.activeToolName
    const t = ctrl.t.t
    const isLoading = Object.values(ctrl.state.providerStates).some((s) => s.loading)
    const showPortalRegion = bridge.omniBarPortal != null
    const placeholder = ctrl.resolveOmniBarPlaceholder()

    return html`
      <nuxy-shell-omni-bar
        .query=${query}
        .placeholder=${placeholder}
        aria-label=${t('omniBar.ariaLabel')}
        .activeToolName=${activeToolName ?? ''}
        ?static=${!showOmniBar}
        ?disabled=${!showOmniBar}
        ?loading=${isLoading}
        @mousedown=${(e: MouseEvent) => ctrl.handleDragMouseDown(e)}
        @click=${() => showOmniBar && ctrl.refs.input?.focus()}
        @nuxy-omni-input=${(e: CustomEvent<{ value: string }>) => {
          ctrl.handleQueryChange(e.detail.value)
        }}
        @nuxy-omni-keydown=${(e: CustomEvent<{ nativeEvent: KeyboardEvent }>) => {
          ctrl.handleOmniKeyDown(e.detail.nativeEvent)
          if (e.detail.nativeEvent.defaultPrevented) e.stopPropagation()
        }}
        @keydown=${(e: KeyboardEvent) => {
          const target = (e.composedPath?.()[0] || e.target) as HTMLElement
          if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
            ctrl.handleOmniKeyDown(e)
          }
        }}
      >
        ${showPortalRegion
          ? html`
              <nuxy-portal-host
                id="nuxy-omnibar-portal-host"
                .portalElement=${bridge.omniBarPortal}
                @mousedown=${(e: MouseEvent) => e.stopPropagation()}
              ></nuxy-portal-host>
            `
          : nothing}
      </nuxy-shell-omni-bar>
    `
  }

  private renderSectionHeader(label: string, loading = false) {
    return html`
      <nuxy-section-header label=${label}>
        ${loading ? html`<nuxy-spinner slot="action" size="sm"></nuxy-spinner>` : nothing}
      </nuxy-section-header>
    `
  }

  private renderProviderResults(
    providerStates: Record<string, ProviderState>,
    copiedId: string | null
  ) {
    const ctrl = this.controller
    if (!ctrl) return nothing
    const resultIds = Object.keys(providerStates).filter(
      (id) => providerStates[id].type === 'result'
    )
    const compareIds = Object.keys(providerStates).filter(
      (id) => providerStates[id].type === 'compare'
    )

    return html`
      ${resultIds.map((id) => {
        const state = providerStates[id]
        if (!state.items || state.items.length === 0) {
          if (!state.loading) return nothing
          return html`
            <section class="nuxy-shell-results-section">
              ${this.renderSectionHeader(state.name, true)}
              <div class="nuxy-shell-results-section__skeletons">
                <nuxy-skeleton height="52"></nuxy-skeleton>
              </div>
            </section>
          `
        }
        return html`
          <section class="nuxy-shell-results-section">
            ${this.renderSectionHeader(state.name, state.loading)}
            <div class="nuxy-shell-results-section__body">
              ${state.items.map(
                (item) => html`
                  <nuxy-result-card
                    item-id=${item.id}
                    title=${item.title}
                    value=${item.value || nothing}
                    provider-name=${state.name}
                    ?copied=${copiedId === item.id}
                    @nuxy-result-card-copy=${(e: CustomEvent<{ id: string }>) =>
                      ctrl.handleCopy(e.detail.id)}
                  ></nuxy-result-card>
                `
              )}
            </div>
          </section>
        `
      })}
      ${compareIds.map((id) => {
        const state = providerStates[id]
        if (!state.items || state.items.length === 0) {
          if (!state.loading) return nothing
          return html`
            <section class="nuxy-shell-results-section">
              ${this.renderSectionHeader(state.name, true)}
              <div class="nuxy-shell-results-section__skeletons">
                <nuxy-skeleton height="70"></nuxy-skeleton>
              </div>
            </section>
          `
        }
        return html`
          <section class="nuxy-shell-results-section">
            ${this.renderSectionHeader(state.name, state.loading)}
            <div class="nuxy-shell-results-section__body">
              ${state.items.map((item) => {
                const meta = (item as ResultItem).meta
                if (!meta?.left || !meta?.right) return nothing
                return html`
                  <nuxy-compare-card
                    item-id=${item.id}
                    value=${item.value || nothing}
                    .meta=${meta}
                    ?copied=${copiedId === item.id}
                    @nuxy-result-card-copy=${(e: CustomEvent<{ id: string }>) =>
                      ctrl.handleCopy(e.detail.id)}
                  ></nuxy-compare-card>
                `
              })}
            </div>
          </section>
        `
      })}
    `
  }

  private renderOmnibarSections(
    sections: OmnibarSection[],
    selectedIndex: number,
    isAnyListProviderLoading: boolean,
    startIndex = 0
  ) {
    let flatIndex = startIndex

    const renderedSections = sections.map((section) => {
      if (section.items.length === 0 && !section.loading) return nothing

      const sectionStart = flatIndex

      const listItems = section.items.map((item) => {
        const currentIndex = flatIndex++
        const active = currentIndex === selectedIndex
        return html`
          <nuxy-list-item
            .active=${active}
            role="option"
            aria-selected=${active ? 'true' : 'false'}
            @click=${() => this.controller?.handleItemClick(item)}
          >
            ${item.icon
              ? html`<nuxy-icon name=${item.icon} size="16" style="flex-shrink:0"></nuxy-icon>`
              : nothing}
            <nuxy-list-item-body>
              <nuxy-list-item-text>${item.title}</nuxy-list-item-text>
              ${item.subtitle
                ? html`<nuxy-list-item-meta>${item.subtitle}</nuxy-list-item-meta>`
                : nothing}
            </nuxy-list-item-body>
          </nuxy-list-item>
        `
      })

      const sectionEnd = flatIndex
      const localActiveIndex =
        selectedIndex >= sectionStart && selectedIndex < sectionEnd
          ? selectedIndex - sectionStart
          : -1

      const listEl = html`
        <nuxy-list role="presentation" active-index=${localActiveIndex}>${listItems}</nuxy-list>
      `

      return html`
        <section class="nuxy-shell-results-section">
          ${this.renderSectionHeader(section.label, section.loading)} ${listEl}
          ${section.loading && section.items.length === 0
            ? html`
                <div class="nuxy-shell-results-section__skeletons">
                  <nuxy-skeleton height="38"></nuxy-skeleton>
                </div>
              `
            : nothing}
        </section>
      `
    })

    return html`
      ${renderedSections}
      ${isAnyListProviderLoading && !sections.some((s) => s.loading)
        ? html`
            <section class="nuxy-shell-results-section">
              <div class="nuxy-shell-results-section__skeletons">
                <nuxy-skeleton height="38"></nuxy-skeleton>
                <nuxy-skeleton height="38" width="80%"></nuxy-skeleton>
              </div>
            </section>
          `
        : nothing}
    `
  }

  private hasVisibleProviderResults(providerStates: Record<string, ProviderState>): boolean {
    return Object.values(providerStates).some((state) => {
      if (state.type === 'list') return false
      return state.loading || Boolean(state.items?.length)
    })
  }

  private renderResultsPanel(
    providerStates: Record<string, ProviderState>,
    sections: OmnibarSection[],
    selectedIndex: number,
    isAnyListProviderLoading: boolean,
    copiedId: string | null
  ) {
    const ctrl = this.controller
    if (!ctrl) return nothing

    const hasProviderContent = this.hasVisibleProviderResults(providerStates)
    const toolSections = sections.filter((section) => section.id === 'tools')
    const listProviderSections = sections.filter((section) => section.id !== 'tools')
    const hasToolsContent = toolSections.some((section) => section.items.length > 0)
    const hasListProviderContent =
      listProviderSections.some((section) => section.items.length > 0 || section.loading) ||
      isAnyListProviderLoading
    const toolsFlatCount = toolSections.reduce((count, section) => count + section.items.length, 0)

    if (!hasProviderContent && !hasToolsContent && !hasListProviderContent) return nothing

    return html`
      <div
        class="nuxy-shell-results-panel"
        role="listbox"
        aria-label=${ctrl.t.t('results.ariaLabel')}
      >
        <div class="nuxy-zone" ?data-visible=${hasProviderContent}>
          <div class="nuxy-zone-inner">
            ${hasProviderContent ? this.renderProviderResults(providerStates, copiedId) : nothing}
          </div>
        </div>
        ${hasToolsContent
          ? this.renderOmnibarSections(toolSections, selectedIndex, false)
          : nothing}
        <div class="nuxy-zone" ?data-visible=${hasListProviderContent}>
          <div class="nuxy-zone-inner">
            ${hasListProviderContent
              ? this.renderOmnibarSections(
                  listProviderSections,
                  selectedIndex,
                  isAnyListProviderLoading,
                  toolsFlatCount
                )
              : nothing}
          </div>
        </div>
      </div>
    `
  }

  private renderShortcutBar(
    toolActions: CommandPaletteAction[],
    keyActionHints: KeyAction[],
    footerPortal: HTMLElement | null
  ) {
    const ctrl = this.controller
    if (!ctrl) return nothing
    const { tools, activeTool, selectedIndex, listResults, extensionSummary, holdProgress } =
      ctrl.state
    const t = ctrl.t.t

    const hasFooterContent =
      footerPortal != null || (activeTool != null && keyActionHints.length > 0)

    return html`
      <nuxy-shortcut-bar>
        <nuxy-shortcut-hint>
          ${hasFooterContent
            ? html`
                ${footerPortal
                  ? html`<nuxy-portal-host
                      id="nuxy-footer-portal-host"
                      .portalElement=${footerPortal}
                    ></nuxy-portal-host>`
                  : nothing}
                ${activeTool
                  ? keyActionHints.map(
                      (a, i) => html`
                        ${i > 0 || footerPortal
                          ? html`<nuxy-shortcut-sep></nuxy-shortcut-sep>`
                          : nothing}
                        <span class="nuxy-shortcut-action" @click=${() => a.handler()}>
                          ${(Array.isArray(a.hint) ? a.hint : [a.hint]).map(
                            (k) => html`
                              <nuxy-kbd
                                .keys=${k}
                                .holdMs=${holdTargetMatches(a, holdProgress)
                                  ? holdProgress!.ms
                                  : null}
                              ></nuxy-kbd>
                            `
                          )}
                          <span>${a.label}</span>
                        </span>
                      `
                    )
                  : nothing}
              `
            : extensionSummary
              ? html`
                  <span>
                    ${[
                      extensionSummary.tools > 0
                        ? t(
                            'footer.tools',
                            { count: extensionSummary.tools },
                            extensionSummary.tools
                          )
                        : null,
                      extensionSummary.themes > 0
                        ? t(
                            'footer.themes',
                            { count: extensionSummary.themes },
                            extensionSummary.themes
                          )
                        : null,
                      extensionSummary.iconpacks > 0
                        ? t(
                            'footer.iconpacks',
                            { count: extensionSummary.iconpacks },
                            extensionSummary.iconpacks
                          )
                        : null,
                      extensionSummary.uikit > 0
                        ? t(
                            'footer.uikit',
                            { count: extensionSummary.uikit },
                            extensionSummary.uikit
                          )
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                `
              : html` <span>${t('footer.extensionsLoaded', { count: tools.length + 1 })}</span> `}
        </nuxy-shortcut-hint>

        <nuxy-shortcut-hint>
          ${selectedIndex >= 0 && listResults.length > 0 && !activeTool
            ? html`
                <span>${t('footer.pressToRun')}</span>
                <nuxy-kbd keys="↵"></nuxy-kbd>
                <span>${t('footer.toRun')}</span>
              `
            : toolActions.length > 0
              ? html`
                  <nuxy-kbd keys="Ctrl"></nuxy-kbd>
                  <nuxy-kbd keys="K"></nuxy-kbd>
                  <span>${t('footer.toActions')}</span>
                `
              : nothing}
        </nuxy-shortcut-hint>
      </nuxy-shortcut-bar>
    `
  }

  render() {
    const ctrl = this.controller
    if (!ctrl) return nothing

    const s = ctrl.state
    const style = ctrl.containerStyle()
    const styleStr = Object.entries(style)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${k}:${v}`)
      .join(';')

    // Keep same tool host element across renders to preserve its internal state
    let toolHostEl: HTMLElement | null = null
    if (s.activeTool) {
      if (this.lastActiveTool !== s.activeTool || !this.toolHostEl?.isConnected) {
        if (this.toolHostEl) {
          this.toolHostEl.remove()
          this.toolHostEl = null
        }
        const newHost = createToolHost(ctrl)
        this.toolHostEl = newHost
        this.lastActiveTool = s.activeTool
      } else if (this.toolHostEl) {
        this.toolHostEl.extensionId = s.activeTool
        this.toolHostEl.query = s.query
        this.toolHostEl.committedQuery = s.savedQuery
      }
      toolHostEl = this.toolHostEl
    } else {
      this.lastActiveTool = null
      this.toolHostEl = null
    }

    const containerClass = s.themeStyles?.container ?? 'nuxy-shell-container'

    return html`
      <div
        class="nuxy-shell-backdrop"
        @click=${(e: MouseEvent) => {
          if (e.target === e.currentTarget) window.core?.window?.esc?.()
        }}
      >
        <nuxy-shell ${ref(this._shellRef)} class=${containerClass} style=${styleStr}>
          <nuxy-shell-resize-handles
            @nuxy-shell-resize-start=${(e: Event) => {
              const detail = (e as CustomEvent<{ direction: string; nativeEvent: MouseEvent }>)
                .detail
              ctrl.handleResizeMouseDown(detail.nativeEvent, detail.direction)
            }}
          ></nuxy-shell-resize-handles>
          <div class="nuxy-main-wrapper">
            <div class="nuxy-shell-body">
              ${this.renderOmniBar()}
              ${s.activeTool
                ? nothing
                : this.renderResultsPanel(
                    s.providerStates,
                    s.omnibarSections,
                    s.selectedIndex,
                    s.isAnyListProviderLoading,
                    s.copiedId
                  )}
              ${toolHostEl
                ? html`<div class="nuxy-shell-tool-wrapper">${toolHostEl}</div>`
                : nothing}
            </div>
            <div class="nuxy-shell-footer">
              ${this.renderShortcutBar(
                s.bridge.toolActions as never[],
                s.bridge.keyActionHints as never[],
                s.bridge.footerPortal
              )}
              <nuxy-toaster></nuxy-toaster>
            </div>
          </div>
        </nuxy-shell>
        ${s.showCommandPalette
          ? html`
              <nuxy-command-palette
                .actions=${s.bridge.toolActions}
                .containerEl=${ctrl.refs.container}
                .position=${s.position}
                .translateFn=${ctrl.t.t}
                .onClose=${() => ctrl.closeCommandPalette()}
              ></nuxy-command-palette>
            `
          : nothing}
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-shell-view': NuxyShellViewElement
  }
}
