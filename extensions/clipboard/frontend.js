const EXT_ID = 'com.nuxy.clipboard'

export default function ClipboardView({ query }) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    ListItemActions,
    Button,
    Kbd,
    EmptyState,
    ShortcutBar,
    ShortcutHint,
    ShortcutSep
  } = window.UI || {}

  const [items, setItems] = React.useState([])
  const [copiedId, setCopiedId] = React.useState(null)
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const [actionFocus, setActionFocus] = React.useState('card')

  const searchQuery = query || ''

  const loadHistory = () => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'getHistory')
      .then((res) => {
        if (res?.success) setItems(res.data || [])
      })
      .catch(console.error)
  }

  React.useEffect(() => {
    loadHistory()
    const interval = setInterval(loadHistory, 1500)
    return () => clearInterval(interval)
  }, [])

  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter((item) => item.text?.toLowerCase().includes(q))
  }, [items, searchQuery])

  React.useEffect(() => {
    setSelectedIndex(-1)
  }, [searchQuery])

  React.useEffect(() => {
    const action = selectedIndex >= 0 ? 'hide' : 'show'
    window.dispatchEvent(
      new CustomEvent('omniBar-control', { detail: { action } })
    )
  }, [selectedIndex])

  React.useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent('omniBar-control', { detail: { action: 'show' } })
      )
    }
  }, [])

  React.useEffect(() => {
    setActionFocus('card')
  }, [selectedIndex])

  React.useEffect(() => {
    const el = document.querySelector('[data-selected="true"]')
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedIndex])

  const handleCopy = (id, eStop) => {
    if (eStop) eStop.stopPropagation()
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'copyItem', id)
      .then((res) => {
        if (!res?.success) return
        setItems(res.data || [])
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 1800)
        setTimeout(() => {
          window.core?.window?.hide?.()
        }, 150)
      })
      .catch(console.error)
  }

  const handleDelete = (id, eStop) => {
    if (eStop) eStop.stopPropagation()
    const targetIdx = filteredItems.findIndex((item) => item.id === id)
    if (targetIdx === 0) return
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'deleteItem', id)
      .then((res) => {
        if (!res?.success) return
        const newItems = res.data || []
        setItems(newItems)
        setSelectedIndex((prev) => {
          if (prev < 0) return prev
          const newLen = searchQuery.trim()
            ? newItems.filter((i) =>
                i.text?.toLowerCase().includes(searchQuery.toLowerCase())
              ).length
            : newItems.length
          return newLen === 0 ? -1 : Math.min(prev, newLen - 1)
        })
      })
      .catch(console.error)
  }

  React.useEffect(() => {
    const handleKey = (e) => {
      const { key } = e.detail
      if (filteredItems.length === 0) return

      if (key === 'ArrowDown') {
        setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1))
      } else if (key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev <= 0 ? -1 : prev - 1))
      } else if (key === 'ArrowRight') {
        setActionFocus('delete')
      } else if (key === 'ArrowLeft') {
        setActionFocus('card')
      } else if (selectedIndex >= 0) {
        if (key.toLowerCase() === 's') {
          setSelectedIndex(-1)
        } else if (key.toLowerCase() === 'd' && selectedIndex !== 0) {
          const item = filteredItems[selectedIndex]
          if (item) handleDelete(item.id)
        } else if (key.toLowerCase() === 'c' || key === 'Enter') {
          const item = filteredItems[selectedIndex]
          if (item) handleCopy(item.id)
        }
      }
    }
    window.addEventListener('omniBar-keydown', handleKey)
    return () => window.removeEventListener('omniBar-keydown', handleKey)
  }, [filteredItems, selectedIndex, actionFocus])

  const timeAgo = (dateString) => {
    if (!dateString) return ''
    const m = Math.floor((Date.now() - new Date(dateString)) / 60000)
    if (m < 1) return 'current'
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div>
      <List maxHeight="md">
        {filteredItems.length === 0 ? (
          <EmptyState
            message={searchQuery ? 'No matches.' : 'History is empty.'}
            hint={
              searchQuery
                ? 'Try a different search.'
                : 'Copied text will appear here.'
            }
          />
        ) : (
          filteredItems.map((item, idx) => {
            const isCopied = copiedId === item.id
            const isActive = idx === selectedIndex
            return (
              <ListItem
                key={item.id}
                active={isActive}
                onClick={() => handleCopy(item.id)}
                data-selected={isActive ? 'true' : 'false'}
              >
                <ListItemBody>
                  <ListItemText variant={isCopied ? 'success' : 'default'}>
                    {isCopied ? 'Copied!' : item.text}
                  </ListItemText>
                  <ListItemMeta>{timeAgo(item.copiedAt)}</ListItemMeta>
                </ListItemBody>
                <ListItemActions>
                  {!isCopied && idx !== 0 && (
                    <Button
                      variant="danger"
                      onClick={(ev) => handleDelete(item.id, ev)}
                    >
                      ×
                    </Button>
                  )}
                  {!isCopied && (
                    <Button
                      variant="primary"
                      onClick={(ev) => handleCopy(item.id, ev)}
                    >
                      Copy
                    </Button>
                  )}
                </ListItemActions>
              </ListItem>
            )
          })
        )}
      </List>

      {selectedIndex >= 0 && (
        <ShortcutBar>
          <ShortcutHint>
            <Kbd>S</Kbd>
            <span>search</span>
          </ShortcutHint>
          {selectedIndex !== 0 && (
            <ShortcutHint>
              <Kbd>D</Kbd>
              <span>delete</span>
            </ShortcutHint>
          )}
          <ShortcutHint>
            <Kbd>C</Kbd>
            <ShortcutSep />
            <Kbd>↵</Kbd>
            <span>copy</span>
          </ShortcutHint>
        </ShortcutBar>
      )}
    </div>
  )
}
