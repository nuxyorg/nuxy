const EXT_ID = 'com.nuxy.emoji-picker'
const COLS = 9

const _useTwoPanelNav = (window.UI || {}).useTwoPanelNav || null

export default function EmojiPicker({ query, extensionId }) {
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
  } = window.UI || {}

  const [emojiCategories, setEmojiCategories] = React.useState(null)
  const [emojiMap, setEmojiMap] = React.useState(null)
  const [favorites, setFavorites] = React.useState([])
  const [selectedIdx, setSelectedIdx] = React.useState(0)
  const [copiedEmoji, setCopiedEmoji] = React.useState(null)

  const navRef = React.useRef(null)
  const rightPanelRef = React.useRef(null)
  const categoryRefs = React.useRef({})
  const sectionRefs = React.useRef({})
  const isProgrammaticScrollRef = React.useRef(false)
  const programmaticScrollTimeoutRef = React.useRef(null)

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
      .then((data) => {
        setEmojiCategories(data)
        const map = new Map(data.flatMap((cat) => cat.emojis.map((em) => [em.e, em])))
        setEmojiMap(map)
      })
      .catch(console.error)
  }, [extensionId])

  React.useEffect(() => {
    window.core?.ipc
      ?.invoke(EXT_ID, 'getFavorites')
      .then((res) => {
        if (res?.success) setFavorites(res.data || [])
      })
      .catch(console.error)
  }, [])

  const allCategories = React.useMemo(() => {
    if (!emojiCategories || !emojiMap) return []
    const favEmojis = favorites.map((e) => emojiMap.get(e) || { e, n: e, k: '' }).filter(Boolean)
    const cats = [...emojiCategories]
    if (favEmojis.length > 0) {
      cats.unshift({ id: 'favorites', label: 'Favorites', icon: '⭐', emojis: favEmojis })
    }
    return cats
  }, [favorites, emojiCategories, emojiMap])

  const searchResults = React.useMemo(() => {
    if (!emojiCategories) return null
    const q = (query || '').toLowerCase().trim()
    if (!q) return null
    const results = []
    const seen = new Set()
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

  const { visibleEmojis, categoryIndices } = React.useMemo(() => {
    if (searchResults) return { visibleEmojis: searchResults, categoryIndices: {} }
    const flat = []
    const indices = {}
    for (const cat of allCategories) {
      if (cat.emojis.length > 0) {
        indices[cat.id] = flat.length
        flat.push(...cat.emojis)
      }
    }
    return { visibleEmojis: flat, categoryIndices: indices }
  }, [searchResults, allCategories])

  const navSections = React.useMemo(
    () =>
      allCategories
        .filter((cat) => cat.emojis.length > 0)
        .map((cat) => ({
          id: cat.id,
          label: cat.label,
          icon: cat.icon,
          itemCount: cat.emojis.length,
        })),
    [allCategories]
  )

  const isFav = (emoji) => favorites.includes(emoji)

  const toggleFavorite = React.useCallback((emoji) => {
    window.core?.ipc
      ?.invoke(EXT_ID, 'toggleFavorite', emoji)
      .then((res) => {
        if (res?.success) setFavorites(res.data || [])
      })
      .catch(console.error)
  }, [])

  const copyEmoji = React.useCallback((emoji) => {
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
      .catch(console.error)
  }, [])

  // Grid left/right: switches to left panel when at left edge of any row
  const moveFocusRight = React.useCallback(
    (delta) => {
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
    (direction) => {
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

      let currentCat = null
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
          let prevCat = null
          let prevSectionStart = 0
          const currentCatIdx = allCategories.findIndex((c) => c.id === currentCat.id)
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
          let nextCat = null
          let nextSectionStart = sectionStart + catLen
          const currentCatIdx = allCategories.findIndex((c) => c.id === currentCat.id)
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
        onSectionChange: (id) => {
          startProgrammaticScroll()
          if (sectionRefs.current[id]) {
            sectionRefs.current[id].scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        },
        onFocusRight: (id) => {
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
      categoryRefs.current[selectedIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedIdx, focusArea])

  // Update active tab while the user manually scrolls the right panel
  const handleScroll = React.useCallback(() => {
    if (isProgrammaticScrollRef.current) return
    const container = rightPanelRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    let currentCatId = null

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
  }, [allCategories, catId])

  if (!emojiCategories) return null

  const renderEmoji = (em, idx) => {
    const fav = isFav(em.e)
    return (
      <GridItem
        key={em.e + idx}
        ref={(el) => (categoryRefs.current[idx] = el)}
        active={focusArea === 'right' && idx === selectedIdx}
        title={`${em.n}${fav ? ' ⭐' : ''}`}
        onClick={() => copyEmoji(em.e)}
        onContextMenu={(e) => {
          e.preventDefault()
          toggleFavorite(em.e)
        }}
      >
        {em.e}
        {fav && (
          <span
            style={{
              position: 'absolute',
              top: 1,
              right: 2,
              fontSize: 7,
              lineHeight: 1,
              opacity: 0.75,
            }}
          >
            ★
          </span>
        )}
      </GridItem>
    )
  }

  const rightContent = (
    <div
      ref={rightPanelRef}
      className="nuxy-emoji-picker__right-panel"
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 8px' }}
      onScroll={handleScroll}
    >
      {searchResults && (
        <div
          style={{
            padding: '4px 12px 10px',
            fontSize: 11,
            opacity: 0.45,
            flexShrink: 0,
            letterSpacing: 0.2,
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
            fontSize: 13,
            textAlign: 'center',
            padding: '0 20px',
          }}
        >
          {catId === 'favorites' && !searchResults
            ? 'No favorites yet — press Ctrl+F on an emoji to add it.'
            : 'No results.'}
        </div>
      ) : Grid ? (
        searchResults ? (
          <Grid cols={COLS} gap={2}>
            {visibleEmojis.map((em, idx) => renderEmoji(em, idx))}
          </Grid>
        ) : (
          <div>
            {(() => {
              let globalIdx = 0
              return allCategories.map((cat) => {
                if (cat.emojis.length === 0) return null
                const sectionStart = globalIdx
                globalIdx += cat.emojis.length
                return (
                  <div
                    key={cat.id}
                    ref={(el) => (sectionRefs.current[cat.id] = el)}
                    style={{ marginBottom: 12 }}
                  >
                    {SectionHeader ? (
                      <SectionHeader label={cat.label} />
                    ) : (
                      <div
                        style={{ padding: '4px 12px', fontSize: 12, opacity: 0.5, fontWeight: 500 }}
                      >
                        {cat.label}
                      </div>
                    )}
                    <Grid cols={COLS} gap={2}>
                      {cat.emojis.map((em, i) => renderEmoji(em, sectionStart + i))}
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
            onChange={(id) => {
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
                <ItemLeading>{cat.icon}</ItemLeading>
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
