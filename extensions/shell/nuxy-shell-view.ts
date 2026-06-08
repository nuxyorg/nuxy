import { ShellController } from './shell-controller.ts'
import {
  createCommandPalette,
  createOmniBar,
  createToolHost,
  renderOmnibarSections,
  renderProviderResults,
  renderShortcutBar,
} from './shell-dom.ts'
import { ensureShellStyles } from './utils.ts'
import './nuxy-shell.ts'
import './nuxy-portal-host.ts'
import './nuxy-shell-resize-handles.ts'
import './nuxy-result-card.ts'
import './nuxy-compare-card.ts'
import './nuxy-shell-omni-bar.ts'
import './nuxy-shell-skeleton-list.ts'
import './nuxy-command-palette.ts'

ensureShellStyles()

export class NuxyShellViewElement extends HTMLElement {
  private controller: ShellController | null = null
  private backdrop: HTMLDivElement | null = null
  private shellEl: HTMLElement | null = null
  private omniMount: HTMLDivElement | null = null
  private resultsMount: HTMLDivElement | null = null
  private toolMount: HTMLDivElement | null = null
  private shortcutMount: HTMLDivElement | null = null
  private paletteMount: HTMLDivElement | null = null
  private toasterMount: HTMLDivElement | null = null
  private omniBarEl: HTMLElement | null = null
  private toolHostEl: (HTMLElement & {
    extensionId: string
    query: string
    committedQuery: string
  }) | null = null
  private lastActiveTool: string | null = null
  private resizeHandles: HTMLElement | null = null

  // Smart render state
  private listItemEls = new Map<number, HTMLElement>()
  private prevSectionsKey = ''
  private prevSelectedIndex = -1

  // Tool loading state
  private loadingTimer: ReturnType<typeof setTimeout> | null = null
  private loadingObserver: MutationObserver | null = null

  private computeSectionsKey(s: import('./shell-controller.ts').ShellControllerState): string {
    if (s.activeTool) return `tool:${s.activeTool}`
    const sectionPart = s.omnibarSections
      .map((sec) => `${sec.id}:${sec.items.length}${sec.loading ? '~' : ''}`)
      .join('|')
    return `${sectionPart}|L${s.isAnyListProviderLoading ? 1 : 0}|P${s.bridge.omniBarPortal ? 1 : 0}|O${s.showOmniBar ? 1 : 0}`
  }

  connectedCallback(): void {
    if (this.controller) return
    this.build()
    this.controller = new ShellController(() => this.render())
    this.controller.refs.container = this.shellEl
    if (this.resizeHandles) {
      this.resizeHandles.addEventListener('nuxy-shell-resize-start', (e) => {
        const detail = (e as CustomEvent<{ direction: string; nativeEvent: MouseEvent }>).detail
        this.controller!.handleResizeMouseDown(detail.nativeEvent, detail.direction)
      })
    }
    this.controller.connect()
    this.render()
  }

  disconnectedCallback(): void {
    this.clearToolLoading()
    this.controller?.disconnect()
    this.controller = null
  }

  private clearToolLoading(): void {
    if (this.loadingTimer !== null) {
      clearTimeout(this.loadingTimer)
      this.loadingTimer = null
    }
    this.loadingObserver?.disconnect()
    this.loadingObserver = null
    this.toolMount?.querySelector('nuxy-loading-state')?.remove()
  }

  private build(): void {
    this.backdrop = document.createElement('div')
    this.backdrop.className = 'nuxy-shell-backdrop'
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) window.core?.window?.esc?.()
    })

    this.shellEl = document.createElement('nuxy-shell')
    this.shellEl.className = 'nuxy-shell-container'

    const mainWrapper = document.createElement('div')
    mainWrapper.className = 'nuxy-main-wrapper'

    const body = document.createElement('div')
    body.className = 'nuxy-shell-body'

    this.omniMount = document.createElement('div')
    this.resultsMount = document.createElement('div')
    this.toolMount = document.createElement('div')
    this.toolMount.className = 'nuxy-shell-tool-wrapper'
    this.shortcutMount = document.createElement('div')

    body.appendChild(this.omniMount)
    body.appendChild(this.resultsMount)
    body.appendChild(this.toolMount)

    mainWrapper.appendChild(body)
    mainWrapper.appendChild(this.shortcutMount)

    this.resizeHandles = document.createElement('nuxy-shell-resize-handles')
    this.shellEl.appendChild(this.resizeHandles)
    this.shellEl.appendChild(mainWrapper)

    this.paletteMount = document.createElement('div')
    this.toasterMount = document.createElement('div')

    this.backdrop.appendChild(this.shellEl)
    this.backdrop.appendChild(this.paletteMount)
    this.backdrop.appendChild(this.toasterMount)
    this.appendChild(this.backdrop)
  }

  private render(): void {
    const ctrl = this.controller
    if (!ctrl || !this.shellEl || !this.omniMount || !this.resultsMount || !this.toolMount || !this.shortcutMount) {
      return
    }

    const s = ctrl.state
    const style = ctrl.containerStyle()
    Object.assign(this.shellEl.style, style)
    this.shellEl.className = s.themeStyles?.container ?? 'nuxy-shell-container'

    // Fast path: list structure unchanged — only toggle active attribute on items
    const key = this.computeSectionsKey(s)
    if (key === this.prevSectionsKey) {
      if (s.selectedIndex !== this.prevSelectedIndex) {
        const oldEl = this.listItemEls.get(this.prevSelectedIndex)
        if (oldEl) oldEl.removeAttribute('active')
        const newEl = this.listItemEls.get(s.selectedIndex)
        if (newEl) newEl.setAttribute('active', '')
        this.prevSelectedIndex = s.selectedIndex
      }
      // Sync input value (query may change via bindQuerySelectionSync without list changing)
      if (ctrl.refs.input && ctrl.refs.input.value !== s.query) {
        ctrl.refs.input.value = s.query
      }
      // Shortcut bar depends on selectedIndex
      this.shortcutMount.replaceChildren(
        renderShortcutBar(ctrl, s.bridge.toolActions as never[], s.bridge.keyActionHints as never[], s.bridge.footerPortal)
      )
      return
    }

    // Full render
    this.prevSectionsKey = key
    this.prevSelectedIndex = s.selectedIndex
    this.listItemEls.clear()

    // Omni bar
    const omniBar = createOmniBar(ctrl, (input) => {
      ctrl.refs.input = input
    })
    this.omniMount.replaceChildren(omniBar)
    this.omniBarEl = omniBar
    if (ctrl.refs.input && ctrl.refs.input.value !== s.query) {
      ctrl.refs.input.value = s.query
    }

    // Results vs tool
    this.resultsMount.replaceChildren()

    if (!s.activeTool) {
      this.clearToolLoading()
      this.toolMount.replaceChildren()
      this.toolHostEl = null
      this.lastActiveTool = null
      this.resultsMount.appendChild(
        renderProviderResults(s.providerStates, s.copiedId, (id) => ctrl.handleCopy(id))
      )
      this.resultsMount.appendChild(
        renderOmnibarSections(
          s.omnibarSections,
          s.savedQuery,
          s.selectedIndex,
          s.isAnyListProviderLoading,
          (item) => void ctrl.handleItemClick(item),
          (i, el) => this.listItemEls.set(i, el)
        )
      )
    } else {
      const needsNewHost =
        this.lastActiveTool !== s.activeTool || !this.toolHostEl?.isConnected

      if (needsNewHost) {
        this.clearToolLoading()
        this.toolMount.replaceChildren()

        this.toolHostEl = createToolHost(ctrl) as HTMLElement & {
          extensionId: string
          query: string
          committedQuery: string
        }

        const observer = new MutationObserver(() => {
          if (!this.toolHostEl?.classList.contains('nuxy-tool-host--loading')) {
            this.clearToolLoading()
          }
        })
        this.loadingObserver = observer

        this.loadingTimer = setTimeout(() => {
          this.loadingTimer = null
          if (this.toolMount && this.toolHostEl?.classList.contains('nuxy-tool-host--loading')) {
            const loading = document.createElement('nuxy-loading-state')
            loading.setAttribute('message', ctrl.t.t('loading'))
            loading.setAttribute('min-height', '200px')
            this.toolMount.prepend(loading)
          }
        }, 1000)

        this.toolMount.appendChild(this.toolHostEl)
        observer.observe(this.toolHostEl, { attributes: true, attributeFilter: ['class'] })

        if (!this.toolHostEl.classList.contains('nuxy-tool-host--loading')) {
          this.clearToolLoading()
        }

        this.lastActiveTool = s.activeTool
      } else if (this.toolHostEl) {
        this.toolHostEl.extensionId = s.activeTool ?? ''
        this.toolHostEl.query = s.query
        this.toolHostEl.committedQuery = s.savedQuery
      }
    }

    // Shortcut bar
    this.shortcutMount.replaceChildren(
      renderShortcutBar(ctrl, s.bridge.toolActions as never[], s.bridge.keyActionHints as never[], s.bridge.footerPortal)
    )

    // Command palette
    if (this.paletteMount) {
      this.paletteMount.replaceChildren()
      if (s.showCommandPalette) {
        this.paletteMount.appendChild(createCommandPalette(ctrl))
      }
    }

    // Toaster
    if (this.toasterMount && !this.toasterMount.querySelector('nuxy-toaster')) {
      this.toasterMount.appendChild(document.createElement('nuxy-toaster'))
    }
  }
}

if (!customElements.get('nuxy-shell-view')) {
  customElements.define('nuxy-shell-view', NuxyShellViewElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-shell-view': NuxyShellViewElement
  }
}

export function registerNuxyShellView(): void {
  /* side-effect registration */
}
