const EXT_ID = 'com.nuxy.angrysearch'

export default function AngrysearchView({ query }) {
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
    ShortcutSep,
  } = window.UI || {}

  const [items, setItems] = React.useState([])
  const [regexMode, setRegexMode] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const [status, setStatus] = React.useState(null)

  const searchQuery = query || ''

  React.useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'getStatus')
      .then((res) => {
        if (res?.success) setStatus(res.data)
      })
      .catch(console.error)
  }, [])

  React.useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    if (searchQuery.trim().length < 3) {
      setItems([])
      return
    }

    const timer = setTimeout(() => {
      window.core.ipc
        .invoke(EXT_ID, 'search', { query: searchQuery, regex: regexMode })
        .then((res) => {
          if (res?.success) {
            setItems(res.data?.items || [])
            setSelectedIndex(res.data?.items?.length > 0 ? 0 : -1)
          }
        })
        .catch(console.error)
    }, 150)

    return () => clearTimeout(timer)
  }, [searchQuery, regexMode])

  const handleOpen = (item) => {
    if (!window.core?.ipc?.invoke || !item) return
    window.core.ipc.invoke(EXT_ID, 'openFile', item.value).catch(console.error)
  }

  const handleOpenLocation = (item) => {
    if (!window.core?.ipc?.invoke || !item) return
    window.core.ipc.invoke(EXT_ID, 'openLocation', item.value).catch(console.error)
  }

  React.useEffect(() => {
    const handleKey = (e) => {
      const { key, shiftKey, altKey } = e.detail

      if (key === 'F8' || (key.toLowerCase() === 'r' && altKey)) {
        setRegexMode((prev) => !prev)
        return
      }

      if (items.length === 0) return

      if (key === 'ArrowDown') {
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1))
      } else if (key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev <= 0 ? 0 : prev - 1))
      } else if (key === 'Enter') {
        const item = items[selectedIndex]
        if (item) {
          if (shiftKey) handleOpenLocation(item)
          else handleOpen(item)
        }
      }
    }
    window.addEventListener('nuxy-shell-omni-bar-keydown', handleKey)
    return () => window.removeEventListener('nuxy-shell-omni-bar-keydown', handleKey)
  }, [items, selectedIndex])

  const triggerUpdate = React.useCallback(() => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc.invoke(EXT_ID, 'updateDatabase').then(() => {
      setStatus((prev) => ({ ...prev, isUpdating: true }))
    })
  }, [])

  React.useEffect(() => {
    const actions = [{ id: 'update-db', label: 'Update Database', onExecute: triggerUpdate }]
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
  }, [triggerUpdate])

  return (
    <div>
      <div
        style={{
          padding: '0 12px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '12px', color: regexMode ? '#ef4444' : 'var(--text-muted)' }}>
          {regexMode ? '● REGEX MODE ACTIVE' : '○ STANDARD MODE'}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {status === null
              ? 'Loading...'
              : status.isUpdating
                ? 'Updating DB...'
                : status.exists
                  ? 'DB Ready'
                  : 'DB Missing'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={triggerUpdate}
            disabled={status?.isUpdating || status === null}
          >
            {status?.isUpdating ? 'Updating...' : 'Update DB'}
          </Button>
        </div>
      </div>

      <List maxHeight="md">
        {items.length === 0 ? (
          <EmptyState
            message={searchQuery.length < 3 ? 'Type to search...' : 'No matches.'}
            hint={
              searchQuery.length < 3 ? 'Enter at least 3 characters.' : 'Try a different search.'
            }
          />
        ) : (
          items.map((item, idx) => {
            const isActive = idx === selectedIndex
            return (
              <ListItem key={item.id} active={isActive} onClick={() => handleOpen(item)}>
                <ListItemBody>
                  <ListItemText>
                    <span style={{ marginRight: '6px', fontSize: '1.1em' }}>
                      {item.isDir ? '📁' : '📄'}
                    </span>
                    {item.title}
                  </ListItemText>
                  <ListItemMeta>{item.subtitle}</ListItemMeta>
                </ListItemBody>
                <ListItemActions>
                  <Button
                    variant="outline"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      handleOpenLocation(item)
                    }}
                  >
                    {item.isDir ? 'Parent' : 'Folder'}
                  </Button>
                </ListItemActions>
              </ListItem>
            )
          })
        )}
      </List>

      <ShortcutBar>
        <ShortcutHint>
          <Kbd>F8</Kbd>
          <span>toggle regex</span>
        </ShortcutHint>
        <ShortcutSep />
        {selectedIndex >= 0 && (
          <>
            <ShortcutHint>
              <Kbd>⇧</Kbd>
              <Kbd>↵</Kbd>
              <span>open folder</span>
            </ShortcutHint>
            <ShortcutSep />
            <ShortcutHint>
              <Kbd>↵</Kbd>
              <span>open file</span>
            </ShortcutHint>
          </>
        )}
      </ShortcutBar>
    </div>
  )
}
