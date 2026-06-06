export const _useTranslation: (extId: string) => {
  t: (key: string) => string
  locale: string
  dir: 'ltr' | 'rtl'
} =
  (window.UI as any)?.useTranslation ??
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

export const _useTwoPanelNav: (opts: { sections: Array<{ id: string }> }) => {
  focusArea: 'left' | 'right'
  setFocusArea: (area: 'left' | 'right') => void
  activeSectionId: string
  goToSection: (id: string) => void
  sectionStartIndex: Record<string, number>
  getSectionIdForIndex: (idx: number) => string
  onItemSelected: (idx: number) => void
  setActiveSection: (id: string) => void
} =
  (window.UI as any)?.useTwoPanelNav ??
  (({ sections }) => ({
    focusArea: 'right' as const,
    setFocusArea: () => {},
    activeSectionId: sections[0]?.id ?? '',
    goToSection: () => {},
    sectionStartIndex: {} as Record<string, number>,
    getSectionIdForIndex: () => sections[0]?.id ?? '',
    onItemSelected: () => {},
    setActiveSection: () => {},
  }))
