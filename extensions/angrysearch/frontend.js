const EXT_ID = 'com.nuxy.angrysearch'

const _useListNavigation = (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))

export default function AngrysearchView({ query }) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    ListItemActions,
    Button,
    EmptyState,
    ShortcutSep,
  } = window.UI || {}

  const [items, setItems] = React.useState([])
  const [regexMode, setRegexMode] = React.useState(false)
  const [status, setStatus] = React.useState(null)

  const searchQuery = query || ''

  const selectedIndexRef = React.useRef(-1)

  const handleOpen = (item) => {
    if (!window.core?.ipc?.invoke || !item) return
    window.core.ipc.invoke(EXT_ID, 'openFile', item.value).catch(console.error)
  }

  const handleOpenLocation = (item) => {
    if (!window.core?.ipc?.invoke || !item) return
    window.core.ipc.invoke(EXT_ID, 'openLocation', item.value).catch(console.error)
  }

  const { selectedIndex, setSelectedIndex } = _useListNavigation(items, {
    onEnter: (item) => handleOpen(item),
    enterLabel: 'Open file',
    enterHint: 'Enter',
    extraActions: [
      {
        key: 'Enter',
        modifiers: ['shift'],
        label: 'Open folder',
        hint: ['⇧', 'Enter'],
        handler: () => {
          const item = items[selectedIndexRef.current]
          if (item) handleOpenLocation(item)
        },
      },
      {
        key: 'F8',
        label: 'Toggle mode',
        hint: 'F8',
        handler: () => setRegexMode((m) => !m),
      },
    ],
  })

  React.useLayoutEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

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
            const newItems = res.data?.items || []
            setItems(newItems)
            setSelectedIndex(newItems.length > 0 ? 0 : -1)
          }
        })
        .catch(console.error)
    }, 150)

    return () => clearTimeout(timer)
  }, [searchQuery, regexMode])

  const triggerUpdate = React.useCallback(() => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc.invoke(EXT_ID, 'updateDatabase').then(() => {
      setStatus((prev) => ({ ...prev, isUpdating: true }))
    })
  }, [])

  React.useEffect(() => {
    const actions = [
      { id: 'update-db', label: 'Update Database', onExecute: triggerUpdate },
      { id: 'toggle-regex', label: 'Toggle Regex Mode', onExecute: () => setRegexMode((m) => !m) },
    ]
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
  }, [triggerUpdate])

  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('nuxy-shell-footer-hints', {
        detail: (
          <>
            <span style={{ color: regexMode ? '#ef4444' : 'var(--text-muted)' }}>
              {regexMode ? 'Regex Mode' : 'Normal Mode'}
            </span>
            {ShortcutSep ? <ShortcutSep /> : <span className="nuxy-shortcut-sep">/</span>}
            <span>
              {status === null
                ? 'Loading...'
                : status.isUpdating
                  ? 'Updating DB...'
                  : status.exists
                    ? 'DB Ready'
                    : 'DB Missing'}
            </span>
          </>
        ),
      }),
    )
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', { detail: null }))
    }
  }, [regexMode, status])

  return (
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

            </ListItem>
          )
        })
      )}
    </List>
  )
}
