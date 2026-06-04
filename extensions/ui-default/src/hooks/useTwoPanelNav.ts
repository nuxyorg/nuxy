import { useState, useMemo, useRef, useCallback } from 'react'
import { useToolKeyActions, KeyAction } from './useToolKeyActions'
import { useTranslation } from './useTranslation'

// Keys whose handlers are merged (left-panel vs right-panel) rather than
// appended as duplicates. ArrowLeft/Right are included so callers can
// override the default panel-switch with per-cell grid navigation.
const BUILTIN_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'])

export interface TwoPanelNavSection {
  id: string
  label: string
  icon?: string
  /** Total number of items in this section (for sectionStartIndex computation) */
  itemCount: number
}

export type TwoPanelFocusArea = 'left' | 'right'

export interface UseTwoPanelNavOptions {
  sections: TwoPanelNavSection[]
  /** Whether a select/dropdown is currently open — suppresses Left arrow when true */
  selectOpen?: boolean
  /** Initial focus area. Defaults to 'right'. */
  initialFocusArea?: TwoPanelFocusArea
  /**
   * Called when activeSectionId changes (e.g. tab click, keyboard nav).
   * Use this to scroll the right panel to the new section.
   */
  onSectionChange?: (id: string) => void
  /**
   * Called when keyboard focus moves from the left panel to the right panel
   * (ArrowRight or Enter from left). Use this to reset the right panel's
   * selected item to the first item of the newly active section.
   */
  onFocusRight?: (sectionId: string) => void
  /**
   * Extra key actions to add when focus is on the RIGHT panel.
   * Use this for ArrowUp/ArrowDown item navigation, Enter to open, etc.
   */
  rightPanelActions?: KeyAction[]
}

export interface UseTwoPanelNavResult {
  /** Which panel currently has keyboard focus */
  focusArea: TwoPanelFocusArea
  setFocusArea: (area: TwoPanelFocusArea) => void
  /** ID of the currently active/highlighted section tab */
  activeSectionId: string
  /** Navigate to a section by id — switches focusArea to 'right' */
  goToSection: (id: string) => void
  /**
   * Map of sectionId → flat list start index.
   * Useful when you maintain a single flat array of items.
   */
  sectionStartIndex: Record<string, number>
  /**
   * Given a flat item index, returns the section it belongs to.
   * Useful for deriving activeSectionId from a selected row index.
   */
  getSectionIdForIndex: (index: number) => string
  /**
   * Call this when the user selects an item in the right panel
   * (click or keyboard) — keeps activeSectionId in sync.
   */
  onItemSelected: (index: number) => void
  /**
   * Set the active section by id without changing focusArea or calling onSectionChange.
   * Use this to sync the left tab from a scroll event.
   */
  setActiveSection: (id: string) => void
}

export function useTwoPanelNav({
  sections,
  selectOpen = false,
  initialFocusArea = 'right',
  onSectionChange,
  onFocusRight,
  rightPanelActions = [],
}: UseTwoPanelNavOptions): UseTwoPanelNavResult {
  const { t } = useTranslation('com.nuxy.shell')
  const tr = useCallback(
    (key: string, fallback: string) => {
      const val = t(key)
      return val === '' || val === key ? fallback : val
    },
    [t]
  )

  const [focusArea, setFocusArea] = useState<TwoPanelFocusArea>(initialFocusArea)
  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id ?? '')

  // Keep a stable ref so key handlers always see latest state + right-panel actions
  const stateRef = useRef({
    focusArea,
    activeSectionId,
    sections,
    selectOpen,
    onSectionChange,
    onFocusRight,
    rightPanelActions,
  })
  stateRef.current = {
    focusArea,
    activeSectionId,
    sections,
    selectOpen,
    onSectionChange,
    onFocusRight,
    rightPanelActions,
  }

  // Precompute section start indices from itemCount
  const sectionStartIndex = useMemo(() => {
    const map: Record<string, number> = {}
    let offset = 0
    for (const s of sections) {
      map[s.id] = offset
      offset += s.itemCount
    }
    return map
  }, [sections])

  const getSectionIdForIndex = useCallback(
    (index: number): string => {
      let activeSec = sections[0]?.id ?? ''
      let offset = 0
      for (const s of sections) {
        if (index < offset + s.itemCount) {
          activeSec = s.id
          break
        }
        offset += s.itemCount
      }
      return activeSec
    },
    [sections]
  )

  const onItemSelected = useCallback(
    (index: number) => {
      setActiveSectionId(getSectionIdForIndex(index))
    },
    [getSectionIdForIndex]
  )

  const goToSection = useCallback((id: string) => {
    setActiveSectionId(id)
    setFocusArea('right')
    stateRef.current.onSectionChange?.(id)
  }, [])

  // Left panel: navigate sections with Up/Down
  const moveSectionUp = useCallback(() => {
    const { sections, activeSectionId, onSectionChange } = stateRef.current
    const idx = sections.findIndex((s) => s.id === activeSectionId)
    const prev = sections[Math.max(0, idx - 1)]
    if (prev && prev.id !== activeSectionId) {
      setActiveSectionId(prev.id)
      onSectionChange?.(prev.id)
    }
  }, [])

  const moveSectionDown = useCallback(() => {
    const { sections, activeSectionId, onSectionChange } = stateRef.current
    const idx = sections.findIndex((s) => s.id === activeSectionId)
    const next = sections[Math.min(sections.length - 1, idx + 1)]
    if (next && next.id !== activeSectionId) {
      setActiveSectionId(next.id)
      onSectionChange?.(next.id)
    }
  }, [])

  // Dispatch a right-panel action by key — always reads the freshest handler via ref
  const callRightAction = useCallback((key: string) => {
    const action = stateRef.current.rightPanelActions.find(
      (a) => a.key === key && !a.modifiers?.length
    )
    action?.handler()
  }, [])

  useToolKeyActions([
    {
      key: 'ArrowLeft',
      label: tr('keyboard.focusTabs', 'Focus tabs'),
      handler: () => {
        const { focusArea, selectOpen, rightPanelActions } = stateRef.current
        if (focusArea !== 'right' || selectOpen) return
        const activeEl = document.activeElement
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          if (!activeEl.classList.contains('nuxy-shell-omni-bar__input')) {
            return
          }
        }
        const rightAction = rightPanelActions.find(
          (a) => a.key === 'ArrowLeft' && !a.modifiers?.length
        )
        if (rightAction) rightAction.handler()
        else setFocusArea('left')
      },
    },
    {
      key: 'ArrowRight',
      label: tr('keyboard.focusContent', 'Focus content'),
      handler: () => {
        const { focusArea, activeSectionId, onFocusRight } = stateRef.current
        if (focusArea === 'left') {
          setFocusArea('right')
          onFocusRight?.(activeSectionId)
        } else {
          const activeEl = document.activeElement
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            if (!activeEl.classList.contains('nuxy-shell-omni-bar__input')) {
              return
            }
          }
          callRightAction('ArrowRight')
        }
      },
    },
    {
      key: 'ArrowUp',
      label: tr('keyboard.previous', 'Previous'),
      hint: '↑↓',
      allowRepeat: true,
      handler: () => {
        const { focusArea } = stateRef.current
        if (focusArea === 'left') moveSectionUp()
        else {
          const activeEl = document.activeElement
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            if (!activeEl.classList.contains('nuxy-shell-omni-bar__input')) {
              return
            }
          }
          callRightAction('ArrowUp')
        }
      },
    },
    {
      key: 'ArrowDown',
      label: tr('keyboard.next', 'Next'),
      allowRepeat: true,
      handler: () => {
        const { focusArea } = stateRef.current
        if (focusArea === 'left') moveSectionDown()
        else {
          const activeEl = document.activeElement
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            if (!activeEl.classList.contains('nuxy-shell-omni-bar__input')) {
              return
            }
          }
          callRightAction('ArrowDown')
        }
      },
    },
    {
      key: 'Enter',
      label: tr('keyboard.selectConfirm', 'Select / confirm'),
      hint: '↵',
      handler: () => {
        const { focusArea, activeSectionId, onFocusRight } = stateRef.current
        if (focusArea === 'left') {
          setFocusArea('right')
          onFocusRight?.(activeSectionId)
        } else {
          const activeEl = document.activeElement
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            if (!activeEl.classList.contains('nuxy-shell-omni-bar__input')) {
              return
            }
          }
          callRightAction('Enter')
        }
      },
    },
    // Non-overlapping right-panel actions are gated on focusArea === 'right'
    // so they never fire when the user is navigating the left tab bar.
    ...rightPanelActions
      .filter((a) => !BUILTIN_KEYS.has(a.key) || a.modifiers?.length)
      .map((a) => ({
        ...a,
        handler: () => {
          if (stateRef.current.focusArea === 'right') a.handler()
        },
      })),
  ])

  return {
    focusArea,
    setFocusArea,
    activeSectionId,
    goToSection,
    sectionStartIndex,
    getSectionIdForIndex,
    onItemSelected,
    setActiveSection: setActiveSectionId,
  }
}
