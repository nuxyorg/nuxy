// fallow-ignore-file code-duplication
import type { KeyAction } from './useToolKeyActions'

export interface TwoPanelNavSection {
  id: string
  label: string
  icon?: string
  itemCount: number
}

export type TwoPanelFocusArea = 'left' | 'right'

export interface UseTwoPanelNavOptions {
  sections: TwoPanelNavSection[]
  selectOpen?: boolean
  initialFocusArea?: TwoPanelFocusArea
  onSectionChange?: (id: string) => void
  onFocusRight?: (sectionId: string) => void
  rightPanelActions?: KeyAction[]
}

export interface UseTwoPanelNavResult {
  focusArea: TwoPanelFocusArea
  setFocusArea: (area: TwoPanelFocusArea) => void
  activeSectionId: string
  goToSection: (id: string) => void
  sectionStartIndex: Record<string, number>
  getSectionIdForIndex: (index: number) => string
  onItemSelected: (index: number) => void
  setActiveSection: (id: string) => void
}

export function useTwoPanelNav(opts: UseTwoPanelNavOptions): UseTwoPanelNavResult {
  const fn = (window.UI as { useTwoPanelNav?: typeof useTwoPanelNav })?.useTwoPanelNav
  if (fn) return fn(opts)
  return {
    focusArea: 'right',
    setFocusArea: () => {},
    activeSectionId: opts.sections[0]?.id ?? '',
    goToSection: () => {},
    sectionStartIndex: {},
    getSectionIdForIndex: () => opts.sections[0]?.id ?? '',
    onItemSelected: () => {},
    setActiveSection: () => {},
  }
}
