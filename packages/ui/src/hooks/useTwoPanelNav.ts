import { useState, useMemo, useRef, useCallback } from 'react'
import { KeyAction } from './useToolKeyActions'

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

export function useTwoPanelNav(...args: any[]): any {
  return (window.UI as any)?.useTwoPanelNav
    ? (window.UI as any).useTwoPanelNav(...args)
    : ({} as any)
}
