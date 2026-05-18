export default function ClipboardView({ query }) {
  const { List, ListItem, Badge, Button, Kbd, EmptyState } = window.UI || {}

  const [items, setItems] = React.useState([])
  const [copiedId, setCopiedId] = React.useState(null)
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const [actionFocus, setActionFocus] = React.useState('card')

  const searchQuery = query || ''

  const loadHistory = () => {
    if (!window.core?.clipboard?.getHistory) return
    window.core.clipboard
      .getHistory()
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
    if (!window.core?.clipboard?.copyItem) return
    window.core.clipboard
      .copyItem(id)
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
    if (!window.core?.clipboard?.deleteItem) return
    window.core.clipboard
      .deleteItem(id)
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
      {/* List */}
      <List className="max-h-[320px]">
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
                <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-2">
                  <span
                    className={`text-sm font-mono truncate transition-colors duration-150 ${
                      isCopied ? 'text-syntax-function' : 'text-syntax-variable'
                    }`}
                  >
                    {isCopied ? 'Copied!' : item.text}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-syntax-keyword">
                      {timeAgo(item.copiedAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
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
                </div>
              </ListItem>
            )
          })
        )}
      </List>

      {/* Keyboard hint footer */}
      {selectedIndex >= 0 && (
        <div className="flex items-center justify-center gap-4 px-4 py-2.5 border-t border-syntax-comment">
          <div className="flex items-center gap-1 text-[10px] text-syntax-keyword">
            <Kbd>S</Kbd>
            <span>search</span>
          </div>
          {selectedIndex !== 0 && (
            <div className="flex items-center gap-1 text-[10px] text-syntax-keyword">
              <Kbd>D</Kbd>
              <span>delete</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px] text-syntax-keyword">
            <Kbd>C</Kbd>
            <span className="opacity-40">/</span>
            <Kbd>↵</Kbd>
            <span>copy</span>
          </div>
        </div>
      )}
    </div>
  )
}
