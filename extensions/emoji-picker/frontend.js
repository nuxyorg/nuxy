const EXT_ID = 'com.nuxy.emoji-picker'
const COLS = 9

const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EmojiPicker({ query, extensionId }) {
  const { TabBar, Grid, GridItem } = window.UI || {}

  const [emojiCategories, setEmojiCategories] = React.useState(null)
  const [emojiMap, setEmojiMap] = React.useState(null)
  const [favorites, setFavorites] = React.useState([])
  const [catId, setCatId] = React.useState('favorites')
  const [selectedIdx, setSelectedIdx] = React.useState(0)
  const [copiedEmoji, setCopiedEmoji] = React.useState(null)
  const gridRef = React.useRef(null)

  // ── Load emoji data async ──
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

  // ── Load favorites ──
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
    return [{ id: 'favorites', label: 'Favorites', icon: '⭐', emojis: favEmojis }, ...emojiCategories]
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

  const currentCat = allCategories.find((c) => c.id === catId) || allCategories[0]
  const visibleEmojis = searchResults || currentCat?.emojis || []

  React.useEffect(() => {
    setSelectedIdx(0)
  }, [catId, query])

  React.useEffect(() => {
    if (!gridRef.current || visibleEmojis.length === 0) return
    const el = gridRef.current.children[selectedIdx]
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedIdx])

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
        setTimeout(() => window.core?.window?.hide?.(), 150)
      })
      .catch(console.error)
  }, [])

  // ── Keyboard actions via useToolKeyActions ──
  const moveFocus = React.useCallback(
    (delta) => {
      const len = visibleEmojis.length
      if (len === 0) return
      setSelectedIdx((prev) => Math.max(0, Math.min(prev + delta, len - 1)))
    },
    [visibleEmojis]
  )

  const handleCopyFocused = React.useCallback(() => {
    const em = visibleEmojis[selectedIdx]
    if (em) copyEmoji(em.e)
  }, [visibleEmojis, selectedIdx, copyEmoji])

  const handleToggleFavorite = React.useCallback(() => {
    const em = visibleEmojis[selectedIdx]
    if (em) toggleFavorite(em.e)
  }, [visibleEmojis, selectedIdx, toggleFavorite])

  const handlePrevCategory = React.useCallback(() => {
    if (searchResults || allCategories.length === 0) return
    const idx = allCategories.findIndex((c) => c.id === catId)
    const prev = (idx - 1 + allCategories.length) % allCategories.length
    setCatId(allCategories[prev].id)
  }, [searchResults, allCategories, catId])

  const handleNextCategory = React.useCallback(() => {
    if (searchResults || allCategories.length === 0) return
    const idx = allCategories.findIndex((c) => c.id === catId)
    const next = (idx + 1) % allCategories.length
    setCatId(allCategories[next].id)
  }, [searchResults, allCategories, catId])

  _useToolKeyActions([
    { key: 'ArrowUp', label: 'Move up', handler: () => moveFocus(-COLS) },
    { key: 'ArrowDown', label: 'Move down', hint: '↑↓←→', handler: () => moveFocus(COLS) },
    { key: 'ArrowLeft', label: 'Move left', handler: () => moveFocus(-1) },
    { key: 'ArrowRight', label: 'Move right', handler: () => moveFocus(1) },
    { key: 'Enter', label: 'Copy emoji', hint: 'Enter', handler: handleCopyFocused },
    { key: 'f', modifiers: ['ctrl'], label: 'Toggle favorite', hint: '⌃F', handler: handleToggleFavorite },
    { key: 'ArrowLeft', modifiers: ['ctrl'], label: 'Prev category', handler: handlePrevCategory },
    { key: 'ArrowRight', modifiers: ['ctrl'], label: 'Next category', handler: handleNextCategory },
  ])

  if (!emojiCategories) return null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* ── Category tabs ── */}
      {!searchResults && (
        TabBar ? (
          <TabBar
            tabs={allCategories.map((cat) => ({ id: cat.id, label: cat.label, icon: cat.icon }))}
            active={catId}
            onChange={setCatId}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              padding: '4px 6px',
              gap: 2,
              borderBottom: '1px solid rgba(128,128,128,0.18)',
              flexShrink: 0,
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {allCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCatId(cat.id)}
                title={cat.label}
                style={{
                  background: cat.id === catId ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  padding: '4px 9px',
                  fontSize: 17,
                  lineHeight: 1,
                  opacity: cat.id === catId ? 1 : 0.55,
                  transition: 'opacity 0.1s, background 0.1s',
                  flexShrink: 0,
                  outline: 'none',
                }}
              >
                {cat.icon}
              </button>
            ))}
          </div>
        )
      )}

      {/* ── Search results label ── */}
      {searchResults && (
        <div
          style={{
            padding: '4px 12px 2px',
            fontSize: 11,
            opacity: 0.45,
            flexShrink: 0,
            letterSpacing: 0.2,
          }}
        >
          {searchResults.length} emoji{searchResults.length !== 1 ? 's' : ''} found
        </div>
      )}

      {/* ── Emoji grid ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 8px' }}>
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
          <div ref={gridRef}>
            <Grid cols={COLS} gap={2}>
              {visibleEmojis.map((em, idx) => {
                const fav = isFav(em.e)
                return (
                  GridItem && (
                    <GridItem
                      key={em.e + idx}
                      active={idx === selectedIdx}
                      title={`${em.n}${fav ? ' ⭐' : ''}`}
                      onClick={() => copyEmoji(em.e)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        toggleFavorite(em.e)
                      }}
                      style={{ fontSize: 22, lineHeight: 1, padding: '4px 0', position: 'relative' }}
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
                )
              })}
            </Grid>
          </div>
        ) : (
          <div
            ref={gridRef}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gap: 2,
            }}
          >
            {visibleEmojis.map((em, idx) => {
              const isSelected = idx === selectedIdx
              const fav = isFav(em.e)
              return (
                <button
                  key={em.e + idx}
                  onClick={() => copyEmoji(em.e)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    toggleFavorite(em.e)
                  }}
                  title={`${em.n}${fav ? ' ⭐' : ''}`}
                  style={{
                    background: isSelected ? 'rgba(255,255,255,0.14)' : 'transparent',
                    border: isSelected
                      ? '1px solid rgba(255,255,255,0.28)'
                      : '1px solid transparent',
                    borderRadius: 7,
                    cursor: 'pointer',
                    padding: '4px 0',
                    fontSize: 22,
                    lineHeight: 1,
                    position: 'relative',
                    transition: 'background 0.08s',
                    outline: 'none',
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
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
