const React = window.React
const EXT_ID = 'com.nuxy.emoji-picker'
const COLS = 9

import type { EmojiEntry, EmojiCategory } from './types.ts'

interface Props {
  query: string
  extensionId: string
}

interface NavSection {
  id: string
  label: string
  icon: string | null
  itemCount: number
}

interface TwoPanelNav {
  focusArea: 'left' | 'right'
  activeSectionId: string | null
  setFocusArea: (area: 'left' | 'right') => void
  setActiveSection: (id: string) => void
  goToSection: (id: string) => void
  onItemSelected: (idx: number) => void
}

interface UseTwoPanelNavOptions {
  sections: NavSection[]
  initialFocusArea: 'left' | 'right'
  onSectionChange: (id: string) => void
  onFocusRight: (id: string) => void
  rightPanelActions: Array<{
    key: string
    label: string
    hint?: string
    handler: () => void
    modifiers?: string[]
  }>
}

const _useTwoPanelNav =
  (window.UI as { useTwoPanelNav?: (opts: UseTwoPanelNavOptions) => TwoPanelNav } | undefined)
    ?.useTwoPanelNav ?? null

export default function EmojiPicker({ query, extensionId }: Props) {
  const {
    Grid,
    GridItem,
    TwoPanel,
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ItemLeading,
    TabBar,
    SectionHeader,
    IconStar,
  } = window.UI || {}

  const [emojiCategories, setEmojiCategories] = React.useState<EmojiCategory[] | null>(null)
  const [emojiMap, setEmojiMap] = React.useState<Map<string, EmojiEntry> | null>(null)
  const [favorites, setFavorites] = React.useState<string[]>([])
  const [selectedIdx, setSelectedIdx] = React.useState<number>(0)
  const [copiedEmoji, setCopiedEmoji] = React.useState<string | null>(null)

  const navRef = React.useRef<TwoPanelNav | null>(null)
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

  React.useEffect(() => {
    return () => {
      if (programmaticScrollTimeoutRef.current) clearTimeout(programmaticScrollTimeoutRef.current)
    }
  }, [])

  React.useEffect(() => {
    fetch(`nuxy-ext://${extensionId}/emojis.json`)
      .then((r) => r.json())
      .then((data: EmojiCategory[]) => {
        setEmojiCategories(data)
        const map = new Map<string, EmojiEntry>(
          data.flatMap((cat) => cat.emojis.map((em) => [em.e, em] as [string, EmojiEntry]))
        )
        setEmojiMap(map)
      })
      .catch(() => {})
  }, [extensionId])

  React.useEffect(() => {
    window.core?.ipc
      ?.invoke(EXT_ID, 'getFavorites')
      .then((res) => {
        const r = res as { success: boolean; data?: string[] } | null
        if (r?.success) setFavorites(r.data || [])
      })
      .catch(() => {})
  }, [])

  const allCategories = React.useMemo<EmojiCategory[]>(() => {
    if (!emojiCategories || !emojiMap) return []
    const favEmojis = favorites
      .map((e: string) => emojiMap!.get(e) || { e, n: e, k: '' })
      .filter(Boolean) as EmojiEntry[]
    const cats = [...emojiCategories]
    if (favEmojis.length > 0) {
      cats.unshift({ id: 'favorites', label: 'Favorites', icon: null, emojis: favEmojis })
    }
    return cats
  }, [favorites, emojiCategories, emojiMap])

  const searchResults = React.useMemo<EmojiEntry[] | null>(() => {
    if (!emojiCategories) return null
    const q = (query || '').toLowerCase().trim()
    if (!q) return null
    const results: EmojiEntry[] = []
    const seen = new Set<string>()
    for (const cat of emojiCategories) {
      const catMatch = cat.label.toLowerCase().includes(q) || cat.id.includes(q)
      for (const em of cat.emojis) {
        if (seen.has(em.e)) continue
        if (catMatch || em.n.toLowerCase().includes(q) || em.k.includes(q)) {
          results.push(em)
          seen.add(em.e)
        }
      }
    }
    return results
  }, [query, emojiCategories])

  const { visibleEmojis, categoryIndices } = React.useMemo<{
    visibleEmojis: EmojiEntry[]
    categoryIndices: Record<string, number>
  }>(() => {
    if (searchResults) return { visibleEmojis: searchResults, categoryIndices: {} }
    const flat: EmojiEntry[] = []
    const indices: Record<string, number> = {}
    for (const cat of allCategories) {
      if (cat.emojis.length > 0) {
        indices[cat.id] = flat.length
        flat.push(...cat.emojis)
      }
    }
    return { visibleEmojis: flat, categoryIndices: indices }
  }, [searchResults, allCategories])

  const navSections = React.useMemo<NavSection[]>(
    () =>
      allCategories
        .filter((cat: EmojiCategory) => cat.emojis.length > 0)
        .map((cat: EmojiCategory) => ({
          id: cat.id,
          label: cat.label,
          icon: cat.icon,
          itemCount: cat.emojis.length,
        })),
    [allCategories]
  )

  const isFav = (emoji: string): boolean => favorites.includes(emoji)

  const toggleFavorite = React.useCallback((emoji: string) => {
    window.core?.ipc
      ?.invoke(EXT_ID, 'toggleFavorite', emoji)
      .then((res) => {
        const r = res as { success: boolean; data?: string[] } | null
        if (r?.success) setFavorites(r.data || [])
      })
      .catch(() => {})
  }, [])

  const copyEmoji = React.useCallback((emoji: string) => {
    window.core?.ipc
      ?.invoke(EXT_ID, 'copy', emoji)
      .then(() => {
        setCopiedEmoji(emoji)
        setTimeout(() => setCopiedEmoji(null), 1200)
        setTimeout(() => {
          window.core?.window?.hide?.()
          setTimeout(() => {
            window.core?.ipc?.invoke(EXT_ID, 'paste')
          }, 50)
        }, 150)
      })
      .catch(() => {})
  }, [])

  // Grid left/right: switches to left panel when at left edge of any row
  const moveFocusRight = React.useCallback(
    (delta: number) => {
      const len = visibleEmojis.length
      if (len === 0) return

      if (delta === -1 && !searchResults) {
        let isLeftEdge = false
        let localIdx = selectedIdx
        for (const cat of allCategories) {
          if (cat.emojis.length > 0) {
            if (localIdx < cat.emojis.length) {
              isLeftEdge = localIdx % COLS === 0
              break
            }
            localIdx -= cat.emojis.length
          }
        }
        if (isLeftEdge) {
          navRef.current?.setFocusArea('left')
          return
        }
      }

      setSelectedIdx(Math.max(0, Math.min(selectedIdx + delta, len - 1)))
    },
    [visibleEmojis, selectedIdx, searchResults, allCategories]
  )

  // Grid up/down: stays within category rows, crossing category boundaries
  const moveFocusUpDown = React.useCallback(
    (direction: number) => {
      const len = visibleEmojis.length
      if (len === 0) return

      if (searchResults) {
        const row = Math.floor(selectedIdx / COLS)
        const col = selectedIdx % COLS
        const nextIdx = (row + direction) * COLS + col
        if (nextIdx >= 0 && nextIdx < len) {
          setSelectedIdx(nextIdx)
        } else if (direction === 1 && nextIdx >= len) {
          const lastRow = Math.floor((len - 1) / COLS)
          if (row < lastRow) setSelectedIdx(len - 1)
        }
        return
      }

      let currentCat: EmojiCategory | null = null
      let sectionStart = 0
      let localIdx = selectedIdx
      for (const cat of allCategories) {
        if (cat.emojis.length > 0) {
          if (localIdx < cat.emojis.length) {
            currentCat = cat
            break
          }
          localIdx -= cat.emojis.length
          sectionStart += cat.emojis.length
        }
      }
      if (!currentCat) return

      const catLen = currentCat.emojis.length
      const row = Math.floor(localIdx / COLS)
      const col = localIdx % COLS

      if (direction === -1) {
        if (row > 0) {
          setSelectedIdx(sectionStart + (row - 1) * COLS + col)
        } else {
          let prevCat: EmojiCategory | null = null
          let prevSectionStart = 0
          const currentCatIdx = allCategories.findIndex(
            (c: EmojiCategory) => c.id === currentCat!.id
          )
          for (let i = currentCatIdx - 1; i >= 0; i--) {
            const cat = allCategories[i]
            if (cat.emojis.length > 0) {
              prevCat = cat
              prevSectionStart = 0
              for (let j = 0; j < i; j++) {
                if (allCategories[j].emojis.length > 0)
                  prevSectionStart += allCategories[j].emojis.length
              }
              break
            }
          }
          if (prevCat) {
            const prevLastRow = Math.floor((prevCat.emojis.length - 1) / COLS)
            setSelectedIdx(
              prevSectionStart + Math.min(prevCat.emojis.length - 1, prevLastRow * COLS + col)
            )
          }
        }
      } else {
        const nextRowStart = (row + 1) * COLS
        if (nextRowStart < catLen) {
          setSelectedIdx(sectionStart + Math.min(catLen - 1, nextRowStart + col))
        } else {
          let nextCat: EmojiCategory | null = null
          let nextSectionStart = sectionStart + catLen
          const currentCatIdx = allCategories.findIndex(
            (c: EmojiCategory) => c.id === currentCat!.id
          )
          for (let i = currentCatIdx + 1; i < allCategories.length; i++) {
            const cat = allCategories[i]
            if (cat.emojis.length > 0) {
              nextCat = cat
              break
            }
            nextSectionStart += cat.emojis.length
          }
          if (nextCat) {
            setSelectedIdx(nextSectionStart + Math.min(nextCat.emojis.length - 1, col))
          }
        }
      }
    },
    [visibleEmojis, selectedIdx, searchResults, allCategories]
  )

  const handleCopyFocused = React.useCallback(() => {
    const em = visibleEmojis[selectedIdx]
    if (em) copyEmoji(em.e)
  }, [visibleEmojis, selectedIdx, copyEmoji])

  const handleToggleFavorite = React.useCallback(() => {
    const em = visibleEmojis[selectedIdx]
    if (em) toggleFavorite(em.e)
  }, [visibleEmojis, selectedIdx, toggleFavorite])

  const rightPanelActions = React.useMemo(
    () => [
      { key: 'ArrowLeft', label: 'Move left', handler: () => moveFocusRight(-1) },
      { key: 'ArrowRight', label: 'Move right', handler: () => moveFocusRight(1) },
      { key: 'ArrowUp', label: 'Move up', hint: '↑↓', handler: () => moveFocusUpDown(-1) },
      { key: 'ArrowDown', label: 'Move down', handler: () => moveFocusUpDown(1) },
      { key: 'Enter', label: 'Copy emoji', hint: '↵', handler: handleCopyFocused },
      { key: 'f', modifiers: ['ctrl'], label: 'Toggle favorite', handler: handleToggleFavorite },
    ],
    [moveFocusRight, moveFocusUpDown, handleCopyFocused, handleToggleFavorite]
  )

  const nav = _useTwoPanelNav
    ? _useTwoPanelNav({
        sections: navSections,
        initialFocusArea: 'left',
        onSectionChange: (id: string) => {
          startProgrammaticScroll()
          const el = sectionRefs.current[id]
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        },
        onFocusRight: (id: string) => {
          setSelectedIdx(categoryIndices[id] ?? 0)
        },
        rightPanelActions,
      })
    : null

  navRef.current = nav

  const focusArea = nav?.focusArea ?? 'left'
  const catId = nav?.activeSectionId || allCategories[0]?.id || null

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

  // Re-evaluate key-action hints when selection state changes
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIdx, focusArea])

  // Update active tab while the user manually scrolls the right panel
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
  }, [allCategories, catId])

  if (!emojiCategories) return null

  const renderEmoji = (em: EmojiEntry, idx: number) => {
    const fav = isFav(em.e)
    return (
      <GridItem
        key={em.e + idx}
        ref={(el: HTMLElement | null) => (categoryRefs.current[idx] = el)}
        active={focusArea === 'right' && idx === selectedIdx}
        title={`${em.n}${fav ? ' (favorite)' : ''}`}
        onClick={() => copyEmoji(em.e)}
        onContextMenu={(e: React.MouseEvent) => {
          e.preventDefault()
          toggleFavorite(em.e)
        }}
      >
        {em.e}
        {fav && IconStar && (
          <IconStar
            style={{
              position: 'absolute',
              top: 'var(--space-0)',
              right: 'var(--space-0)',
              width: 'var(--icon-xs)',
              height: 'var(--icon-xs)',
              color: 'var(--syntax-constant)',
            }}
          />
        )}
      </GridItem>
    )
  }

  const rightContent = (
    <div
      ref={rightPanelRef}
      className="nuxy-emoji-picker__right-panel"
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-2) var(--space-3)' }}
      onScroll={handleScroll}
    >
      {searchResults && (
        <div
          style={{
            padding: 'var(--space-1) var(--space-3) var(--space-2)',
            fontSize: 'var(--font-xs)',
            opacity: 0.45,
            flexShrink: 0,
            letterSpacing: '0.01em',
          }}
        >
          {searchResults.length} emoji{searchResults.length !== 1 ? 's' : ''} found
        </div>
      )}

      {visibleEmojis.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            opacity: 0.38,
            fontSize: 'var(--font-sm)',
            textAlign: 'center',
            padding: '0 var(--space-5)',
          }}
        >
          {catId === 'favorites' && !searchResults
            ? 'No favorites yet — press Ctrl+F on an emoji to add it.'
            : 'No results.'}
        </div>
      ) : Grid ? (
        searchResults ? (
          <Grid cols={COLS} gap={2}>
            {visibleEmojis.map((em: EmojiEntry, idx: number) => renderEmoji(em, idx))}
          </Grid>
        ) : (
          <div>
            {(() => {
              let globalIdx = 0
              return allCategories.map((cat: EmojiCategory) => {
                if (cat.emojis.length === 0) return null
                const sectionStart = globalIdx
                globalIdx += cat.emojis.length
                return (
                  <div
                    key={cat.id}
                    ref={(el: HTMLDivElement | null) => (sectionRefs.current[cat.id] = el)}
                    style={{ marginBottom: 'var(--space-3)' }}
                  >
                    {SectionHeader ? (
                      <SectionHeader label={cat.label} />
                    ) : (
                      <div
                        style={{
                          padding: 'var(--space-1) var(--space-4)',
                          fontSize: 'var(--font-sm)',
                          opacity: 0.5,
                          fontWeight: 500,
                        }}
                      >
                        {cat.label}
                      </div>
                    )}
                    <Grid cols={COLS} gap={2}>
                      {cat.emojis.map((em: EmojiEntry, i: number) =>
                        renderEmoji(em, sectionStart + i)
                      )}
                    </Grid>
                  </div>
                )
              })
            })()}
          </div>
        )
      ) : null}
    </div>
  )

  if (searchResults) return rightContent

  return (
    <TwoPanel
      split="auto"
      style={{ flex: 1, minHeight: 0 }}
      left={
        TabBar ? (
          <TabBar
            orientation="vertical"
            style={{ borderRight: 'none', height: '100%' }}
            tabs={allCategories.map((c) => ({ id: c.id, label: c.label, icon: c.icon }))}
            active={catId}
            onChange={(id: string) => {
              nav?.goToSection(id)
              nav?.setFocusArea('left')
            }}
          />
        ) : (
          <List>
            {allCategories.map((cat) => (
              <ListItem
                key={cat.id}
                active={cat.id === catId}
                onClick={() => {
                  nav?.goToSection(cat.id)
                  nav?.setFocusArea('left')
                }}
              >
                <ItemLeading>
                  {cat.id === 'favorites' && IconStar ? (
                    <IconStar style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)' }} />
                  ) : (
                    cat.icon
                  )}
                </ItemLeading>
                <ListItemBody>
                  <ListItemText>{cat.label}</ListItemText>
                </ListItemBody>
              </ListItem>
            ))}
          </List>
        )
      }
      right={rightContent}
    />
  )
}
