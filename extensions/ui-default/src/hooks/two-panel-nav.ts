import type { ShellKeyAction } from '@nuxy/core'

const BUILTIN_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'])

export interface TwoPanelNavSection {
  id: string
  label: string
  icon?: string
  itemCount: number
}

export type TwoPanelFocusArea = 'left' | 'right'

export interface TwoPanelNavOptions {
  sections: TwoPanelNavSection[]
  selectOpen?: boolean
  initialFocusArea?: TwoPanelFocusArea
  onSectionChange?: (id: string) => void
  onFocusRight?: (sectionId: string) => void
  onFocusLeft?: () => void
  getRightPanelActions?: () => ShellKeyAction[]
  translate?: (key: string, fallback: string) => string
}

export class TwoPanelNav {
  focusArea: TwoPanelFocusArea
  activeSectionId: string
  sectionStartIndex: Record<string, number> = {}

  private sections: TwoPanelNavSection[]
  private selectOpen = false
  private onSectionChange?: (id: string) => void
  private onFocusRight?: (sectionId: string) => void
  private onFocusLeft?: () => void
  private getRightPanelActions: () => ShellKeyAction[]
  private tr: (key: string, fallback: string) => string
  private cleanup: (() => void) | null = null

  constructor(opts: TwoPanelNavOptions) {
    this.sections = opts.sections
    this.selectOpen = opts.selectOpen ?? false
    this.focusArea = opts.initialFocusArea ?? 'right'
    this.activeSectionId = opts.sections[0]?.id ?? ''
    this.onSectionChange = opts.onSectionChange
    this.onFocusRight = opts.onFocusRight
    this.onFocusLeft = opts.onFocusLeft
    this.getRightPanelActions = opts.getRightPanelActions ?? (() => [])
    this.tr = opts.translate ?? ((_, fb) => fb)
    this.recomputeSectionStartIndex()
  }

  bind(): void {
    window.core?.shell?.registerKeyActions(() => this.buildKeyActions())
    this.cleanup = () => window.core?.shell?.registerKeyActions(null)
  }

  unbind(): void {
    this.cleanup?.()
    this.cleanup = null
  }

  updateSections(sections: TwoPanelNavSection[]): void {
    this.sections = sections
    this.recomputeSectionStartIndex()
  }

  setSelectOpen(open: boolean): void {
    this.selectOpen = open
  }

  setFocusArea(area: TwoPanelFocusArea): void {
    this.focusArea = area
  }

  goToSection(id: string): void {
    this.activeSectionId = id
    this.focusArea = 'right'
    this.onSectionChange?.(id)
  }

  onItemSelected(index: number): void {
    this.activeSectionId = this.getSectionIdForIndex(index)
  }

  setActiveSection(id: string): void {
    this.activeSectionId = id
  }

  getSectionIdForIndex(index: number): string {
    let activeSec = this.sections[0]?.id ?? ''
    let offset = 0
    for (const s of this.sections) {
      if (index < offset + s.itemCount) {
        activeSec = s.id
        break
      }
      offset += s.itemCount
    }
    return activeSec
  }

  private recomputeSectionStartIndex(): void {
    const map: Record<string, number> = {}
    let offset = 0
    for (const s of this.sections) {
      map[s.id] = offset
      offset += s.itemCount
    }
    this.sectionStartIndex = map
  }

  private moveSectionUp(): void {
    const idx = this.sections.findIndex((s) => s.id === this.activeSectionId)
    const prev = this.sections[Math.max(0, idx - 1)]
    if (prev && prev.id !== this.activeSectionId) {
      this.activeSectionId = prev.id
      this.onSectionChange?.(prev.id)
    }
  }

  private moveSectionDown(): void {
    const idx = this.sections.findIndex((s) => s.id === this.activeSectionId)
    const next = this.sections[Math.min(this.sections.length - 1, idx + 1)]
    if (next && next.id !== this.activeSectionId) {
      this.activeSectionId = next.id
      this.onSectionChange?.(next.id)
    }
  }

  private callRightAction(key: string): void {
    const action = this.getRightPanelActions().find((a) => a.key === key && !a.modifiers?.length)
    action?.handler()
  }

  private getDeepActiveElement(root: DocumentOrShadowRoot = document): Element | null {
    const activeEl = root.activeElement
    if (!activeEl) return null
    if (activeEl.shadowRoot) {
      return this.getDeepActiveElement(activeEl.shadowRoot)
    }
    return activeEl
  }

  private isOmniInput(el: Element | null): boolean {
    if (!el) return false
    const tagName = el.tagName.toLowerCase()
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      const type = el.getAttribute('type')?.toLowerCase()
      const nonWritingTypes = ['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'image']
      return !type || !nonWritingTypes.includes(type)
    }
    if (el.hasAttribute('contenteditable') && el.getAttribute('contenteditable') !== 'false') {
      return true
    }
    return false
  }

  private buildKeyActions(): ShellKeyAction[] {
    const rightPanelActions = this.getRightPanelActions()
    const tr = this.tr

    return [
      {
        key: 'ArrowLeft',
        label: tr('keyboard.focusTabs', 'Focus tabs'),
        handler: () => {
          if (this.focusArea !== 'right' || this.selectOpen) return
          const activeEl = this.getDeepActiveElement()
          if (
            this.isOmniInput(activeEl) &&
            !activeEl?.classList.contains('nuxy-shell-omni-bar__input')
          ) {
            return
          }
          const rightAction = rightPanelActions.find(
            (a) => a.key === 'ArrowLeft' && !a.modifiers?.length
          )
          if (rightAction) rightAction.handler()
          else {
            this.focusArea = 'left'
            this.onFocusLeft?.()
          }
        },
      },
      {
        key: 'ArrowRight',
        label: tr('keyboard.focusContent', 'Focus content'),
        handler: () => {
          if (this.focusArea === 'left') {
            this.focusArea = 'right'
            this.onFocusRight?.(this.activeSectionId)
          } else {
            const activeEl = this.getDeepActiveElement()
            if (
              this.isOmniInput(activeEl) &&
              !activeEl?.classList.contains('nuxy-shell-omni-bar__input')
            ) {
              return
            }
            this.callRightAction('ArrowRight')
          }
        },
      },
      {
        key: 'ArrowUp',
        label: tr('keyboard.previous', 'Previous'),
        hint: '↑↓',
        allowRepeat: true,
        handler: () => {
          if (this.focusArea === 'left') this.moveSectionUp()
          else {
            const activeEl = this.getDeepActiveElement()
            if (
              this.isOmniInput(activeEl) &&
              !activeEl?.classList.contains('nuxy-shell-omni-bar__input')
            ) {
              return
            }
            this.callRightAction('ArrowUp')
          }
        },
      },
      {
        key: 'ArrowDown',
        label: tr('keyboard.next', 'Next'),
        allowRepeat: true,
        handler: () => {
          if (this.focusArea === 'left') this.moveSectionDown()
          else {
            const activeEl = this.getDeepActiveElement()
            if (
              this.isOmniInput(activeEl) &&
              !activeEl?.classList.contains('nuxy-shell-omni-bar__input')
            ) {
              return
            }
            this.callRightAction('ArrowDown')
          }
        },
      },
      {
        key: 'Enter',
        label: tr('keyboard.selectConfirm', 'Select / confirm'),
        hint: '↵',
        handler: () => {
          if (this.focusArea === 'left') {
            this.focusArea = 'right'
            this.onFocusRight?.(this.activeSectionId)
          } else {
            const activeEl = this.getDeepActiveElement()
            if (
              this.isOmniInput(activeEl) &&
              !activeEl?.classList.contains('nuxy-shell-omni-bar__input')
            ) {
              return
            }
            this.callRightAction('Enter')
          }
        },
      },
      ...rightPanelActions
        .filter((a) => !BUILTIN_KEYS.has(a.key) || a.modifiers?.length)
        .map((a) => ({
          ...a,
          handler: () => {
            if (this.focusArea === 'right') a.handler()
          },
        })),
    ]
  }
}
