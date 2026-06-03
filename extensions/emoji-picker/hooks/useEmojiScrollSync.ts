const React = window.React

import type { EmojiCategory, EmojiEntry } from '../types.ts'

interface TwoPanelNav {
  focusArea: 'left' | 'right'
  activeSectionId: string | null
  setFocusArea: (area: 'left' | 'right') => void
  setActiveSection: (id: string) => void
  onItemSelected: (idx: number) => void
}

interface Params {
  navRef: React.MutableRefObject<TwoPanelNav | null>
  navSections: Array<{ id: string }>
  selectedIdx: number
  setSelectedIdx: React.Dispatch<React.SetStateAction<number>>
  focusArea: 'left' | 'right'
  searchResults: EmojiEntry[] | null
  allCategories: EmojiCategory[]
  query: string
}

interface ScrollSyncResult {
  rightPanelRef: React.MutableRefObject<HTMLDivElement | null>
  categoryRefs: React.MutableRefObject<Record<number, HTMLElement | null>>
  sectionRefs: React.MutableRefObject<Record<string, HTMLElement | null>>
  startProgrammaticScroll: () => void
  handleScroll: () => void
}

export function useEmojiScrollSync({
  navRef,
  navSections,
  selectedIdx,
  setSelectedIdx,
  focusArea,
  searchResults,
  allCategories,
  query,
}: Params): ScrollSyncResult {
  const rightPanelRef = React.useRef<HTMLDivElement | null>(null)
  const categoryRefs = React.useRef<Record<number, HTMLElement | null>>({})
  const sectionRefs = React.useRef<Record<string, HTMLElement | null>>({})
  const isProgrammaticScrollRef = React.useRef<boolean>(false)
  const programmaticScrollTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const startProgrammaticScroll = React.useCallback(() => {
    isProgrammaticScrollRef.current = true
    if (programmaticScrollTimeoutRef.current) clearTimeout(programmaticScrollTimeoutRef.current)
    programmaticScrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false
    }, 1000)
  }, [])

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (programmaticScrollTimeoutRef.current) clearTimeout(programmaticScrollTimeoutRef.current)
    }
  }, [])

  // Sync activeSectionId once categories first load (hook initialised before data arrived)
  React.useEffect(() => {
    if (navSections.length > 0 && !navRef.current?.activeSectionId) {
      navRef.current?.setActiveSection(navSections[0].id)
    }
  }, [navSections])

  // Reset focus and selection when search query changes
  React.useEffect(() => {
    if (searchResults) {
      navRef.current?.setFocusArea('right')
      setSelectedIdx(0)
    } else {
      startProgrammaticScroll()
      navRef.current?.setFocusArea('left')
    }
  }, [query, searchResults, startProgrammaticScroll])

  // Keep hook's activeSectionId in sync as the user navigates the right grid
  React.useEffect(() => {
    if (focusArea === 'right' && !searchResults) {
      navRef.current?.onItemSelected(selectedIdx)
    }
  }, [selectedIdx, focusArea, searchResults])

  // Scroll focused emoji into view when navigating right panel
  React.useEffect(() => {
    if (focusArea === 'right' && categoryRefs.current[selectedIdx]) {
      categoryRefs.current[selectedIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedIdx, focusArea])

  const handleScroll = React.useCallback(() => {
    if (isProgrammaticScrollRef.current) return
    const container = rightPanelRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    let currentCatId: string | null = null

    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 5
    if (isAtBottom && allCategories.length > 0) {
      currentCatId = allCategories[allCategories.length - 1].id
    } else {
      const threshold = containerRect.top + 30
      for (const cat of allCategories) {
        const sectionEl = sectionRefs.current[cat.id]
        if (!sectionEl) continue
        if (sectionEl.getBoundingClientRect().top <= threshold) currentCatId = cat.id
        else break
      }
    }
    void currentCatId
  }, [allCategories])

  return {
    rightPanelRef,
    categoryRefs,
    sectionRefs,
    startProgrammaticScroll,
    handleScroll,
  }
}
