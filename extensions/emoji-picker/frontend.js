const EXT_ID = 'com.nuxy.emoji-picker'
const COLS = 9

const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

export default function EmojiPicker({ query, extensionId }) {
  const { Grid, GridItem, TwoPanel, List, ListItem, ListItemBody, ListItemText, ItemLeading, TabBar, SectionHeader } = window.UI || {}

  const [emojiCategories, setEmojiCategories] = React.useState(null)
  const [emojiMap, setEmojiMap] = React.useState(null)
  const [favorites, setFavorites] = React.useState([])
  
  // Navigation states
  const [focusArea, setFocusArea] = React.useState('left') // 'left' | 'right'
  const [catId, setCatId] = React.useState(null)
  const [selectedIdx, setSelectedIdx] = React.useState(0)
  
  const [copiedEmoji, setCopiedEmoji] = React.useState(null)

  const rightPanelRef = React.useRef(null)
  const categoryRefs = React.useRef({})
  const sectionRefs = React.useRef({})

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
    const favEmojis = favorites
      .map((e) => emojiMap.get(e) || { e, n: e, k: '' })
      .filter(Boolean)
    
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
    if (searchResults) {
      return { visibleEmojis: searchResults, categoryIndices: {} }
    }
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

  React.useEffect(() => {
    if (!catId && allCategories.length > 0) {
      setCatId(allCategories[0].id)
    }
  }, [allCategories, catId])


  // Reset focus when query changes
  React.useEffect(() => {
    if (searchResults) {
      setFocusArea('right')
      setSelectedIdx(0)
    } else {
      setFocusArea('left')
    }
  }, [query, searchResults])

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
          // Wait briefly for window to hide and focus to return to previous app
          setTimeout(() => {
            window.core?.ipc?.invoke(EXT_ID, 'paste')
          }, 50)
        }, 150)
      })
      .catch(console.error)
  }, [])

  // Auto-scroll when category selected in left pane
  React.useEffect(() => {
    if (focusArea === 'left' && !searchResults) {
      if (sectionRefs.current[catId]) {
        sectionRefs.current[catId].scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        const idx = categoryIndices[catId]
        if (idx !== undefined && categoryRefs.current[idx]) {
          categoryRefs.current[idx].scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    }
  }, [catId, focusArea, searchResults, categoryIndices])

  // Scroll to active right item when navigating
  React.useEffect(() => {
    if (focusArea === 'right' && categoryRefs.current[selectedIdx]) {
      categoryRefs.current[selectedIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedIdx, focusArea])

  const moveFocusLeft = React.useCallback((delta) => {
    const idx = allCategories.findIndex((c) => c.id === catId)
    const nextIdx = Math.max(0, Math.min(idx + delta, allCategories.length - 1))
    setCatId(allCategories[nextIdx].id)
  }, [allCategories, catId])

  const moveFocusRight = React.useCallback((delta) => {
    const len = visibleEmojis.length
    if (len === 0) return
    let nextIdx = selectedIdx + delta
    
    // Switch to left focus if at left edge and going left
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
        setFocusArea('left')
        return
      }
    }

    setSelectedIdx(Math.max(0, Math.min(nextIdx, len - 1)))
  }, [visibleEmojis, selectedIdx, searchResults, allCategories])

  const handleCopyFocused = React.useCallback(() => {
    const em = visibleEmojis[selectedIdx]
    if (em) copyEmoji(em.e)
  }, [visibleEmojis, selectedIdx, copyEmoji])

  const handleToggleFavorite = React.useCallback(() => {
    const em = visibleEmojis[selectedIdx]
    if (em) toggleFavorite(em.e)
  }, [visibleEmojis, selectedIdx, toggleFavorite])

  _useToolKeyActions([
    { 
      key: 'ArrowUp', 
      label: 'Move up', 
      handler: () => focusArea === 'left' ? moveFocusLeft(-1) : moveFocusRight(-COLS) 
    },
    { 
      key: 'ArrowDown', 
      label: 'Move down', 
      handler: () => focusArea === 'left' ? moveFocusLeft(1) : moveFocusRight(COLS) 
    },
    { 
      key: 'ArrowLeft', 
      label: 'Move left', 
      handler: () => {
        if (focusArea === 'right') moveFocusRight(-1)
      } 
    },
    { 
      key: 'ArrowRight', 
      label: 'Move right', 
      handler: () => {
        if (focusArea === 'left') {
          setFocusArea('right')
          const idx = categoryIndices[catId] || 0
          setSelectedIdx(idx)
        } else {
          moveFocusRight(1)
        }
      } 
    },
    { key: 'Enter', label: 'Copy/Jump', handler: () => {
        if (focusArea === 'left') {
          setFocusArea('right')
          const idx = categoryIndices[catId] || 0
          setSelectedIdx(idx)
        } else {
          handleCopyFocused()
        }
    }},
    { key: 'f', modifiers: ['ctrl'], label: 'Toggle favorite', handler: handleToggleFavorite },
  ])

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
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 8px' }}
    >
      {searchResults && (
        <div style={{ padding: '4px 12px 10px', fontSize: 11, opacity: 0.45, flexShrink: 0, letterSpacing: 0.2 }}>
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
                  <div key={cat.id} ref={(el) => (sectionRefs.current[cat.id] = el)} style={{ marginBottom: 12 }}>
                    {SectionHeader ? (
                      <SectionHeader label={cat.label} />
                    ) : (
                      <div style={{ padding: '4px 12px', fontSize: 12, opacity: 0.5, fontWeight: 500 }}>
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

  if (searchResults) {
    return rightContent
  }

  return (
    <TwoPanel
      split="140px"
      style={{ flex: 1, minHeight: 0 }}
      left={
        TabBar ? (
          <TabBar
            orientation="vertical"
            style={{ borderRight: 'none', height: '100%' }}
            tabs={allCategories.map(c => ({ id: c.id, label: c.label, icon: c.icon }))}
            active={catId}
            onChange={(id) => {
              setCatId(id)
              setFocusArea('left')
            }}
          />
        ) : (
             <List>
              {allCategories.map((cat) => (
                <ListItem
                  key={cat.id}
                  active={cat.id === catId}
                  onClick={() => {
                    setCatId(cat.id)
                    setFocusArea('left')
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
