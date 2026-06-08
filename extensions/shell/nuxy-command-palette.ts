import type { CommandPaletteAction, Position } from './types.ts'

const MAX_DEPTH = 10

function getZoom(): number {
  const z = document.documentElement.style.zoom
  if (!z) return 1
  if (z.endsWith('%')) return parseFloat(z) / 100
  return parseFloat(z) || 1
}

export class NuxyCommandPaletteElement extends HTMLElement {
  private backdrop: HTMLDivElement | null = null
  private panel: HTMLDivElement | null = null
  private breadcrumbEl: HTMLDivElement | null = null
  private breadcrumbPathEl: HTMLSpanElement | null = null
  private input: HTMLInputElement | null = null
  private listEl: HTMLDivElement | null = null

  private _actions: CommandPaletteAction[] = []
  private _container: HTMLElement | null = null
  private _position: Position = { x: 0, y: 0 }
  private _translate: (key: string) => string = (k) => k
  private _onClose: (() => void) | null = null

  private query = ''
  private selectedIndex = 0
  private menuStack: CommandPaletteAction[][] = []
  private pathLabels: string[] = []
  private keyHandler: ((e: KeyboardEvent) => void) | null = null

  connectedCallback(): void {
    this.build()
    this.resetStack()
    this.render()
    this.keyHandler = (e) => this.onKeyDown(e)
    window.addEventListener('keydown', this.keyHandler)
  }

  disconnectedCallback(): void {
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler)
    this.keyHandler = null
  }

  set actions(value: CommandPaletteAction[]) {
    this._actions = value
    if (this.isConnected) {
      this.resetStack()
      this.render()
    }
  }

  set containerEl(el: HTMLElement | null) {
    this._container = el
    if (this.isConnected) this.updatePosition()
  }

  set position(value: Position) {
    this._position = value
    if (this.isConnected) this.updatePosition()
  }

  set translateFn(fn: (key: string) => string) {
    this._translate = fn
    if (this.isConnected) this.renderList()
  }

  set onClose(fn: (() => void) | null) {
    this._onClose = fn
  }

  private build(): void {
    if (this.backdrop) return

    this.backdrop = document.createElement('div')
    this.backdrop.className = 'nuxy-command-palette-backdrop'
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close()
    })

    this.panel = document.createElement('div')
    this.panel.className = 'nuxy-command-palette'

    this.breadcrumbEl = document.createElement('div')
    this.breadcrumbEl.className = 'nuxy-command-palette__breadcrumb'
    this.breadcrumbEl.hidden = true

    const backBtn = document.createElement('button')
    backBtn.type = 'button'
    backBtn.className = 'nuxy-command-palette__back'
    backBtn.textContent = '←'
    backBtn.addEventListener('click', () => this.goBack())

    this.breadcrumbPathEl = document.createElement('span')
    this.breadcrumbPathEl.className = 'nuxy-command-palette__breadcrumb-path'

    this.breadcrumbEl.append(backBtn, this.breadcrumbPathEl)

    const inputWrap = document.createElement('div')
    inputWrap.className = 'nuxy-command-palette__input-wrapper'

    this.input = document.createElement('input')
    this.input.className = 'nuxy-command-palette__input'
    this.input.autofocus = true
    this.input.addEventListener('input', () => {
      this.query = this.input?.value ?? ''
      this.selectedIndex = 0
      this.renderList()
    })

    inputWrap.appendChild(this.input)

    this.listEl = document.createElement('div')
    this.listEl.className = 'nuxy-command-palette__list'

    this.panel.append(this.breadcrumbEl, inputWrap, this.listEl)
    this.backdrop.appendChild(this.panel)
    this.appendChild(this.backdrop)
  }

  private resetStack(): void {
    this.menuStack = [this._actions]
    this.pathLabels = []
    this.query = ''
    this.selectedIndex = 0
    if (this.input) this.input.value = ''
  }

  private currentLevel(): CommandPaletteAction[] {
    return this.menuStack[this.menuStack.length - 1] ?? []
  }

  private filteredActions(): CommandPaletteAction[] {
    const q = this.query.toLowerCase()
    return this.currentLevel().filter((a) => a.label.toLowerCase().includes(q))
  }

  private goBack(): void {
    if (this.menuStack.length > 1) {
      this.menuStack = this.menuStack.slice(0, -1)
      this.pathLabels = this.pathLabels.slice(0, -1)
      this.query = ''
      this.selectedIndex = 0
      if (this.input) this.input.value = ''
      this.render()
    } else {
      this.close()
    }
  }

  private openSubmenu(action: CommandPaletteAction): void {
    if (!action.children || this.menuStack.length >= MAX_DEPTH) return
    this.menuStack = [...this.menuStack, action.children]
    this.pathLabels = [...this.pathLabels, action.label]
    this.query = ''
    this.selectedIndex = 0
    if (this.input) this.input.value = ''
    this.render()
  }

  private executeAction(action: CommandPaletteAction): void {
    if (action.children) {
      this.openSubmenu(action)
    } else if (action.onExecute) {
      action.onExecute()
      this.close()
    }
  }

  private close(): void {
    this._onClose?.()
  }

  private updatePosition(): void {
    if (!this.panel || !this._container) return

    const zoom = getZoom()
    const cssWindowHeight = window.innerHeight / zoom
    const winWidth = this._container.offsetWidth
    const winHeight = this._container.offsetHeight

    let left = this._position.x + winWidth - 350
    if (left < 12) left = 12

    let bottom = cssWindowHeight - (this._position.y + winHeight)
    if (bottom < 12) bottom = 12

    this.panel.style.position = 'absolute'
    this.panel.style.bottom = `${bottom}px`
    this.panel.style.left = `${left}px`
    this.panel.style.width = '350px'
    this.panel.style.margin = '0'
  }

  private onKeyDown(e: KeyboardEvent): void {
    const filtered = this.filteredActions()

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      this.goBack()
    } else if (e.key === 'ArrowLeft' && this.query === '' && this.menuStack.length > 1) {
      e.preventDefault()
      this.goBack()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.selectedIndex = Math.min(this.selectedIndex + 1, Math.max(0, filtered.length - 1))
      this.renderList()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0)
      this.renderList()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const action = filtered[this.selectedIndex]
      if (action) this.executeAction(action)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      const action = filtered[this.selectedIndex]
      if (action?.children) this.openSubmenu(action)
    }
  }

  private render(): void {
    this.updatePosition()
    if (this.breadcrumbEl && this.breadcrumbPathEl) {
      const show = this.pathLabels.length > 0
      this.breadcrumbEl.hidden = !show
      this.breadcrumbPathEl.textContent = this.pathLabels.join(' › ')
    }
    if (this.input) {
      this.input.placeholder = this._translate('commandPalette.searchPlaceholder')
    }
    this.renderList()
  }

  private renderList(): void {
    if (!this.listEl) return
    const filtered = this.filteredActions()
    this.listEl.replaceChildren()

    if (filtered.length === 0) {
      const empty = document.createElement('div')
      empty.style.padding = '12px 16px'
      empty.style.color = 'var(--syntax-comment)'
      empty.textContent = this._translate('commandPalette.noActions')
      this.listEl.appendChild(empty)
      return
    }

    filtered.forEach((action, idx) => {
      const item = document.createElement('div')
      item.className = [
        'nuxy-command-palette__item',
        idx === this.selectedIndex ? 'nuxy-command-palette__item--active' : '',
      ]
        .filter(Boolean)
        .join(' ')
      item.addEventListener('click', () => this.executeAction(action))

      const label = document.createElement('span')
      label.textContent = action.label

      const trailing = document.createElement('span')
      if (action.children) {
        trailing.className = 'nuxy-command-palette__submenu-arrow'
        trailing.textContent = '›'
      } else {
        trailing.className = 'nuxy-command-palette__shortcut'
        trailing.textContent = this._translate('commandPalette.enterShortcut')
      }

      item.append(label, trailing)
      this.listEl.appendChild(item)
    })
  }
}

if (!customElements.get('nuxy-command-palette')) {
  customElements.define('nuxy-command-palette', NuxyCommandPaletteElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-command-palette': NuxyCommandPaletteElement
  }
}
