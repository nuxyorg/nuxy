import {
  LitElement,
  html,
  css,
  customElement,
  state,
  ref,
  type TemplateResult,
  type ShellAction,
} from '@nuxyorg/core'
import { trapTabKey } from '@nuxyorg/extension-sdk'
import type { Position } from './types.ts'
import {
  filterCommandPaletteSections,
  flattenCommandPaletteSections,
} from './utils/command-palette-sections.ts'
import { formatShortcut } from './utils/shortcut-display.ts'

const MAX_DEPTH = 10

function getZoom(): number {
  const z = document.documentElement.style.zoom
  if (!z) return 1
  if (z.endsWith('%')) return parseFloat(z) / 100
  return parseFloat(z) || 1
}

@customElement('nuxy-command-palette')
export class NuxyCommandPaletteElement extends LitElement {
  static styles = css`
    .nuxy-command-palette-backdrop {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      padding: 32px;
      background-color: transparent;
      z-index: var(--z-modal);
    }

    .nuxy-command-palette {
      width: 100%;
      max-width: 350px;
      background-color: var(--bg-base);
      border: 1px solid var(--syntax-comment);
      border-radius: var(--radius-xl);
      box-shadow: 0 20px 40px -10px var(--shadow-dark, rgba(0, 0, 0, 0.5));
      overflow: hidden;
      animation: slide-up 150ms ease-out;
    }

    @keyframes slide-up {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .nuxy-command-palette__input-wrapper {
      padding: 12px 16px;
      border-bottom: 1px solid var(--syntax-comment);
    }

    .nuxy-command-palette__input {
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      color: var(--syntax-variable);
      font-size: var(--font-lg);
    }

    .nuxy-command-palette__input::placeholder {
      color: var(--syntax-keyword);
    }

    .nuxy-command-palette__list {
      max-height: var(--nuxy-command-palette-list-max-height, 300px);
      overflow-y: auto;
      padding: 0;
    }

    .nuxy-command-palette__list::-webkit-scrollbar {
    }

    .nuxy-command-palette__empty {
      padding: 12px 16px;
      color: var(--syntax-comment);
    }

    .nuxy-command-palette__divider {
      border: none;
      margin: 4px 0 4px;
      height: 1px;
      background: var(--syntax-comment);
    }

    .nuxy-command-palette__submenu-arrow {
      font-size: var(--font-lg);
      color: var(--syntax-comment);
      line-height: 1;
    }

    nuxy-list-item[active] .nuxy-command-palette__submenu-arrow {
      color: var(--syntax-function);
    }

    .nuxy-command-palette__breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--syntax-comment);
      background-color: color-mix(in srgb, var(--syntax-comment) 20%, transparent);
    }

    .nuxy-command-palette__back {
      background: none;
      border: none;
      color: var(--syntax-comment);
      cursor: pointer;
      font-size: var(--font-lg);
      padding: 0 4px;
      line-height: 1;
      border-radius: var(--radius-sm);
      transition:
        color 150ms,
        background-color 150ms;
    }

    .nuxy-command-palette__back:hover {
      color: var(--syntax-variable);
      background-color: color-mix(in srgb, var(--syntax-comment) 40%, transparent);
    }

    .nuxy-command-palette__breadcrumb-path {
      font-size: var(--font-sm);
      color: var(--syntax-keyword);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `

  @state()
  declare private _query: string
  @state()
  declare private _selectedIndex: number
  @state()
  declare private _menuStack: ShellAction[][]
  @state()
  declare private _pathLabels: string[]

  private _selectedIndexStack: number[] = []

  private _actions: ShellAction[] = []
  private _container: HTMLElement | null = null
  private _position: Position = { x: 0, y: 0 }
  private _translate: (key: string) => string = (k) => k
  private _onClose: (() => void) | null = null

  private _panelEl: HTMLDivElement | null = null
  private _inputEl: HTMLInputElement | null = null
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null

  get nativeInput(): HTMLInputElement | null {
    return this._inputEl ?? null
  }

  connectedCallback(): void {
    super.connectedCallback()
    this._resetStack()
    this._keyHandler = (e) => this._onKeyDown(e)
    window.addEventListener('keydown', this._keyHandler)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler)
    this._keyHandler = null
  }

  protected firstUpdated(): void {
    this._focusInput()
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('_selectedIndex')) {
      // active-index on nuxy-list handles scroll
    }
    if (changed.has('_menuStack') || changed.has('_actions')) {
      this._focusInput()
    }
    this._updatePosition()
    if (this._inputEl) {
      this._inputEl.placeholder = this._translate('commandPalette.searchPlaceholder')
    }
  }

  private _focusInput(): void {
    requestAnimationFrame(() => this._inputEl?.focus())
  }

  private _actionTreeKey(actions: ShellAction[]): string {
    return actions
      .map((a) => `${a.id}${a.children?.length ? `[${this._actionTreeKey(a.children)}]` : ''}`)
      .join(',')
  }

  set actions(value: ShellAction[]) {
    const prevKey = this._actionTreeKey(this._actions)
    const nextKey = this._actionTreeKey(value)
    this._actions = value
    if (!this.isConnected) return
    if (prevKey !== nextKey) {
      this._resetStack()
    } else {
      this._menuStack = [value, ...this._menuStack.slice(1)]
    }
    this.requestUpdate()
  }

  set containerEl(el: HTMLElement | null) {
    this._container = el
    if (this.isConnected) this._updatePosition()
  }

  set position(value: Position) {
    this._position = value
    if (this.isConnected) this._updatePosition()
  }

  set translateFn(fn: (key: string) => string) {
    this._translate = fn
    if (this.isConnected) this.requestUpdate()
  }

  set onClose(fn: (() => void) | null) {
    this._onClose = fn
  }

  private _resetStack(): void {
    this._menuStack = [this._actions]
    this._pathLabels = []
    this._selectedIndexStack = []
    this._query = ''
    this._selectedIndex = 0
    if (this._inputEl) this._inputEl.value = ''
  }

  private _currentLevel(): ShellAction[] {
    return this._menuStack[this._menuStack.length - 1] ?? []
  }

  private _filteredActions(): ShellAction[] {
    return flattenCommandPaletteSections(this._filteredSections())
  }

  private _filteredSections() {
    return filterCommandPaletteSections(this._currentLevel(), this._query)
  }

  private _goBack(): void {
    if (this._menuStack.length > 1) {
      this._menuStack = this._menuStack.slice(0, -1)
      this._pathLabels = this._pathLabels.slice(0, -1)
      this._query = ''
      this._selectedIndex = this._selectedIndexStack.pop() ?? 0
      if (this._inputEl) this._inputEl.value = ''
    } else {
      this._close()
    }
  }

  private _openSubmenu(action: ShellAction): void {
    if (!action.children || this._menuStack.length >= MAX_DEPTH) return
    this._selectedIndexStack = [...this._selectedIndexStack, this._selectedIndex]
    this._menuStack = [...this._menuStack, action.children]
    this._pathLabels = [...this._pathLabels, action.label]
    this._query = ''
    this._selectedIndex = 0
    if (this._inputEl) this._inputEl.value = ''
  }

  private _executeAction(action: ShellAction): void {
    if (action.children) {
      this._openSubmenu(action)
    } else {
      action.handler?.()
      this._close()
    }
  }

  private _close(): void {
    this._onClose?.()
  }

  private _updatePosition(): void {
    if (!this._panelEl || !this._container) return

    const zoom = getZoom()
    const cssWindowHeight = window.innerHeight / zoom
    const winWidth = this._container.offsetWidth
    const winHeight = this._container.offsetHeight

    const gap = 8

    let left = this._position.x + winWidth - 350 - gap
    if (left < 12) left = 12

    let bottom = cssWindowHeight - (this._position.y + winHeight) + gap
    if (bottom < 12) bottom = 12

    this._panelEl.style.position = 'absolute'
    this._panelEl.style.bottom = `${bottom}px`
    this._panelEl.style.left = `${left}px`
    this._panelEl.style.width = '350px'
    this._panelEl.style.margin = '0'
  }

  private _onKeyDown(e: KeyboardEvent): void {
    if (this._panelEl) trapTabKey(this._panelEl, e)
    if (e.defaultPrevented) return

    const filtered = this._filteredActions()

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      this._goBack()
    } else if (e.key === 'ArrowLeft' && this._query === '' && this._menuStack.length > 1) {
      e.preventDefault()
      this._goBack()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      this._selectedIndex = Math.min(this._selectedIndex + 1, Math.max(0, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this._selectedIndex = Math.max(this._selectedIndex - 1, 0)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const action = filtered[this._selectedIndex]
      if (action) this._executeAction(action)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      const action = filtered[this._selectedIndex]
      if (action?.children) this._openSubmenu(action)
    }
  }

  private _onInputInput(e: Event): void {
    this._query = (e.target as HTMLInputElement).value
    this._selectedIndex = 0
  }

  private _renderList(): TemplateResult {
    const sections = this._filteredSections()
    const filtered = this._filteredActions()

    if (filtered.length === 0) {
      return html`
        <div class="nuxy-command-palette__empty">
          ${this._translate('commandPalette.noActions')}
        </div>
      `
    }

    let actionIndex = 0

    return html`
      <nuxy-list active-index=${this._selectedIndex}>
        ${sections.flatMap((section, sectionIdx) => {
          const nodes: TemplateResult[] = []
          if (sectionIdx > 0) {
            nodes.push(html`<hr class="nuxy-command-palette__divider" role="separator" />`)
          }
          for (const action of section.actions) {
            const idx = actionIndex++
            nodes.push(html`
              <nuxy-list-item
                ?active=${idx === this._selectedIndex}
                @click=${() => this._executeAction(action)}
              >
                <nuxy-list-item-body>
                  <nuxy-list-item-text>${action.label}</nuxy-list-item-text>
                </nuxy-list-item-body>
                <nuxy-list-item-actions>
                  ${action.children
                    ? html`<span class="nuxy-command-palette__submenu-arrow">›</span>`
                    : (formatShortcut(action) ?? []).map(
                        (k) => html`<nuxy-kbd .keys=${k}></nuxy-kbd>`
                      )}
                </nuxy-list-item-actions>
              </nuxy-list-item>
            `)
          }
          return nodes
        })}
      </nuxy-list>
    `
  }

  render(): TemplateResult {
    const showBreadcrumb = this._pathLabels.length > 0

    return html`
      <div
        class="nuxy-command-palette-backdrop"
        @click=${(e: MouseEvent) => {
          if (e.target === e.currentTarget) this._close()
        }}
      >
        <div
          class="nuxy-command-palette"
          role="dialog"
          aria-modal="true"
          aria-label=${this._translate('commandPalette.searchPlaceholder')}
          ${ref((el) => {
            this._panelEl = el as HTMLDivElement | null
          })}
        >
          <div class="nuxy-command-palette__breadcrumb" ?hidden=${!showBreadcrumb}>
            <button type="button" class="nuxy-command-palette__back" @click=${() => this._goBack()}>
              ←
            </button>
            <span class="nuxy-command-palette__breadcrumb-path"
              >${this._pathLabels.join(' › ')}</span
            >
          </div>
          <div class="nuxy-command-palette__input-wrapper">
            <input
              class="nuxy-command-palette__input"
              autofocus
              spellcheck="false"
              .value=${this._query}
              @input=${this._onInputInput}
              ${ref((el) => {
                this._inputEl = el as HTMLInputElement | null
              })}
            />
          </div>
          <div class="nuxy-command-palette__list">${this._renderList()}</div>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-command-palette': NuxyCommandPaletteElement
  }
}
