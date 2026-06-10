import { TwoPanelNav } from './two-panel-nav.ts'
import type { KeyAction } from './useToolKeyActions'
import { useTranslation } from './useTranslation'

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

const navCache = new WeakMap<object, TwoPanelNav>()

export function useTwoPanelNav(opts: UseTwoPanelNavOptions): UseTwoPanelNavResult {
  const { t } = useTranslation('com.nuxy.shell')
  const tr = (key: string, fallback: string) => {
    const val = t(key)
    return val === '' || val === key ? fallback : val
  }

  const key = opts as object
  let nav = navCache.get(key)
  if (!nav) {
    nav = new TwoPanelNav({
      sections: opts.sections,
      selectOpen: opts.selectOpen,
      initialFocusArea: opts.initialFocusArea,
      onSectionChange: opts.onSectionChange,
      onFocusRight: opts.onFocusRight,
      getRightPanelActions: () => opts.rightPanelActions ?? [],
      translate: tr,
    })
    nav.bind()
    navCache.set(key, nav)
  }

  nav.updateSections(opts.sections)
  nav.setSelectOpen(opts.selectOpen ?? false)

  return {
    focusArea: nav.focusArea,
    setFocusArea: (area) => nav!.setFocusArea(area),
    activeSectionId: nav.activeSectionId,
    goToSection: (id) => nav!.goToSection(id),
    sectionStartIndex: nav.sectionStartIndex,
    getSectionIdForIndex: (index) => nav!.getSectionIdForIndex(index),
    onItemSelected: (index) => nav!.onItemSelected(index),
    setActiveSection: (id) => nav!.setActiveSection(id),
  }
}
