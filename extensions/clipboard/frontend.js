const EXT_ID = 'com.nuxy.clipboard'

// ── helpers ──────────────────────────────────────────────────────────────────

function getItemType(item) {
  const txt = item.text?.trim() || ''
  if (item.image) return 'image'
  if (/^#([0-9a-f]{3,8})$/i.test(txt) || /^rgba?\(\s*[\d.]+/.test(txt) || /^hsla?\(/.test(txt))
    return 'color'
  if (/^https?:\/\//i.test(txt)) return 'url'
  if (/^(\/|~\/)/.test(txt) && txt.length > 2) return 'file'
  if (/^[a-zA-Z]:\\/.test(txt)) return 'file'
  return 'text'
}

function getFilename(path) {
  return path.split(/[\\/]/).filter(Boolean).pop() || path
}

function getParentDir(path) {
  const parts = path.split(/[\\/]/).filter(Boolean)
  if (parts.length <= 1) return ''
  return parts.slice(0, -1).join('/').replace(/^\//, '')
}

function getFileExtension(path) {
  const name = getFilename(path)
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
}

function getFileIconType(ext) {
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff', 'avif'].includes(ext))
    return 'image-file'
  if (['pdf'].includes(ext)) return 'pdf'
  if (
    [
      'js',
      'ts',
      'jsx',
      'tsx',
      'py',
      'rb',
      'go',
      'rs',
      'java',
      'c',
      'cpp',
      'h',
      'cs',
      'php',
      'html',
      'css',
      'json',
      'yaml',
      'yml',
      'sh',
      'bash',
      'fish',
      'zsh',
      'toml',
      'xml',
      'vue',
      'svelte',
      'kt',
      'swift',
    ].includes(ext)
  )
    return 'code'
  if (['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar'].includes(ext)) return 'archive'
  if (['md', 'txt', 'doc', 'docx', 'odt', 'rtf', 'pages'].includes(ext)) return 'document'
  return 'file'
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

const ICON_STYLE = { width: 18, height: 18, opacity: 0.65 }

function IconFile() {
  return (
    <svg
      style={ICON_STYLE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function IconImageFile() {
  return (
    <svg
      style={ICON_STYLE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function IconCode() {
  return (
    <svg
      style={ICON_STYLE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="10 13 8 15 10 17" />
      <polyline points="14 13 16 15 14 17" />
    </svg>
  )
}

function IconDocument() {
  return (
    <svg
      style={ICON_STYLE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  )
}

function IconPdf() {
  return (
    <svg
      style={{ ...ICON_STYLE, opacity: 0.75, color: '#e55' }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 13h1.5a1 1 0 0 1 0 2H9v-4h1.5a1 1 0 0 1 1 1" />
    </svg>
  )
}

function IconArchive() {
  return (
    <svg
      style={ICON_STYLE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg
      style={ICON_STYLE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function FileIconFor({ ext }) {
  const t = getFileIconType(ext)
  if (t === 'image-file') return <IconImageFile />
  if (t === 'code') return <IconCode />
  if (t === 'document') return <IconDocument />
  if (t === 'pdf') return <IconPdf />
  if (t === 'archive') return <IconArchive />
  return <IconFile />
}

// ── ItemLeading helper ────────────────────────────────────────────────────────

function ClipboardItemLeading({ item, type }) {
  const { ItemLeading } = window.UI || {}

  if (!ItemLeading) return null

  if (type === 'image') {
    return (
      <ItemLeading>
        <img
          src={item.image}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          alt=""
        />
      </ItemLeading>
    )
  }

  if (type === 'color') {
    const txt = item.text?.trim() || ''
    return <ItemLeading color={txt} />
  }

  if (type === 'file') {
    const ext = getFileExtension(item.text?.trim() || '')
    return (
      <ItemLeading>
        <FileIconFor ext={ext} />
      </ItemLeading>
    )
  }

  if (type === 'url') {
    return (
      <ItemLeading>
        <IconGlobe />
      </ItemLeading>
    )
  }

  return null
}

// ── display helpers ───────────────────────────────────────────────────────────

function getListLabel(item, type, isCopied) {
  if (isCopied) return 'Copied!'
  const txt = item.text?.trim() || ''
  if (type === 'image') return item.text && item.text !== 'Image' ? item.text : 'Image'
  if (type === 'file') return getFilename(txt)
  return txt
}

function getListMeta(item, type, isCurrent, timeAgo) {
  if (isCurrent) return 'current'
  const txt = item.text?.trim() || ''
  if (type === 'file') {
    const parent = getParentDir(txt)
    return parent ? `…/${parent}` : timeAgo(item.copiedAt)
  }
  if (type === 'color') return 'Color'
  if (type === 'url') return 'URL'
  if (type === 'image') return 'Image'
  return timeAgo(item.copiedAt)
}

// ── main component ────────────────────────────────────────────────────────────

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
    TwoPanel,
  } = window.UI || {}

  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  const [items, setItems] = React.useState([])
  const [copiedId, setCopiedId] = React.useState(null)
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const [imageDimensions, setImageDimensions] = React.useState(null)
  const [fileExists, setFileExists] = React.useState(null)

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
    window.dispatchEvent(new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action } }))
  }, [selectedIndex])

  React.useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'show' } })
      )
    }
  }, [])

  React.useEffect(() => {
    const selectedItem = selectedIndex >= 0 ? filteredItems[selectedIndex] : null
    if (selectedItem?.image) {
      const img = new Image()
      img.onload = () => setImageDimensions(`${img.width} × ${img.height}`)
      img.src = selectedItem.image
    } else {
      setImageDimensions(null)
    }
  }, [selectedIndex, filteredItems])

  React.useEffect(() => {
    const selectedItem = selectedIndex >= 0 ? filteredItems[selectedIndex] : null
    const type = selectedItem ? getItemType(selectedItem) : null
    if (type !== 'file') {
      setFileExists(null)
      return
    }
    setFileExists(null)
    window.core?.ipc
      ?.invoke(EXT_ID, 'checkFile', selectedItem.text?.trim())
      .then((res) => {
        if (res?.success) setFileExists(!!res.data)
      })
      .catch(() => setFileExists(false))
  }, [selectedIndex, filteredItems])

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
        setTimeout(() => window.core?.window?.hide?.(), 150)
      })
      .catch(console.error)
  }

  const handleCopyFile = (id, eStop) => {
    if (eStop) eStop.stopPropagation()
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'copyFile', id)
      .then((res) => {
        if (!res?.success) return
        setItems(res.data || [])
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 1800)
        setTimeout(() => window.core?.window?.hide?.(), 150)
      })
      .catch(console.error)
  }

  const handlePin = (id, eStop) => {
    if (eStop) eStop.stopPropagation()
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'pinItem', id)
      .then((res) => {
        if (res?.success) setItems(res.data || [])
      })
      .catch(console.error)
  }

  const handleUnpin = (id, eStop) => {
    if (eStop) eStop.stopPropagation()
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'unpinItem', id)
      .then((res) => {
        if (res?.success) setItems(res.data || [])
      })
      .catch(console.error)
  }

  const handleDelete = (id, eStop) => {
    if (eStop) eStop.stopPropagation()
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
            ? newItems.filter((i) => i.text?.toLowerCase().includes(searchQuery.toLowerCase()))
                .length
            : newItems.length
          return newLen === 0 ? -1 : Math.min(prev, newLen - 1)
        })
      })
      .catch(console.error)
  }

  _useToolKeyActions([
    {
      key: 'ArrowUp',
      label: 'Previous item',
      hint: '↑↓',
      handler: () => {
        if (filteredItems.length === 0) return
        setSelectedIndex((prev) => (prev <= 0 ? -1 : prev - 1))
      },
    },
    {
      key: 'ArrowDown',
      label: 'Next item',
      handler: () => {
        if (filteredItems.length === 0) return
        setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1))
      },
    },
    {
      key: 'Enter',
      label: 'Copy',
      hint: 'Enter',
      handler: () => {
        const item = filteredItems[selectedIndex]
        if (!item) return
        if (getItemType(item) === 'file') handleCopyFile(item.id)
        else handleCopy(item.id)
      },
    },
    {
      key: 'c',
      modifiers: ['ctrl'],
      label: 'Copy',
      handler: () => {
        const item = filteredItems[selectedIndex]
        if (!item) return
        if (getItemType(item) === 'file') handleCopyFile(item.id)
        else handleCopy(item.id)
      },
    },
    {
      key: 'd',
      label: 'Delete',
      hint: 'D',
      handler: () => {
        if (selectedIndex === 0) return
        const item = filteredItems[selectedIndex]
        if (item) handleDelete(item.id)
      },
    },
    {
      key: 's',
      label: 'Search',
      hint: 'S',
      handler: () => {
        setSelectedIndex(-1)
      },
    },
    {
      key: 'p',
      label: 'Pin / Unpin',
      hint: 'P',
      handler: () => {
        const item = filteredItems[selectedIndex]
        if (!item) return
        if (item.pinned) handleUnpin(item.id)
        else handlePin(item.id)
      },
    },
  ])

  const timeAgo = (dateString) => {
    if (!dateString) return ''
    const m = Math.floor((Date.now() - new Date(dateString)) / 60000)
    if (m < 1) return 'now'
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const selectedItem = selectedIndex >= 0 ? filteredItems[selectedIndex] : null

  const leftPanel = (
    <List>
      {filteredItems.length === 0 ? (
        <EmptyState
          message={searchQuery ? 'No matches.' : 'History is empty.'}
          hint={searchQuery ? 'Try a different search.' : 'Copied text will appear here.'}
        />
      ) : (
        filteredItems.map((item, idx) => {
          const isCopied = copiedId === item.id
          const isActive = idx === selectedIndex
          const isCurrent = items.length > 0 && item.id === items[0].id
          const type = getItemType(item)
          const label = getListLabel(item, type, isCopied)
          const meta = getListMeta(item, type, isCurrent, timeAgo)
          return (
            <ListItem
              key={item.id}
              active={isActive}
              onClick={() => (type === 'file' ? handleCopyFile(item.id) : handleCopy(item.id))}
            >
              <ClipboardItemLeading item={item} type={type} />
              <ListItemBody>
                <ListItemText variant={isCopied ? 'success' : 'default'}>
                  {item.pinned && (
                    <span style={{ marginRight: 5, opacity: 0.6, fontSize: '11px' }}>📌</span>
                  )}
                  {label}
                </ListItemText>
                <ListItemMeta>{meta}</ListItemMeta>
              </ListItemBody>
            </ListItem>
          )
        })
      )}
    </List>
  )

  const rightPanel = selectedItem ? (
    (() => {
      const type = getItemType(selectedItem)
      const txt = selectedItem.text?.trim() || ''

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '16px',
            overflow: 'hidden',
            justifyContent: 'space-between',
            height: 'calc(100% - 32px)',
          }}
        >
          {/* preview area */}
          <div style={{ flex: '1 1 auto', overflowY: 'auto', marginBottom: '12px', minHeight: 0 }}>
            {type === 'image' ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '8px',
                  overflow: 'hidden',
                  height: 'calc(100% - 16px)',
                }}
              >
                <img
                  src={selectedItem.image}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  alt="Clipboard preview"
                />
              </div>
            ) : type === 'color' ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  height: 'calc(100% - 16px)',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    borderRadius: '8px',
                    background: txt,
                    border: '1px solid rgba(255,255,255,0.1)',
                    minHeight: '80px',
                  }}
                />
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '15px',
                    textAlign: 'center',
                    opacity: 0.85,
                    padding: '4px',
                  }}
                >
                  {txt}
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: '13px',
                  lineHeight: 1.55,
                  opacity: 0.8,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: type === 'text' ? 'inherit' : 'monospace',
                  padding: '8px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '8px',
                  height: 'calc(100% - 16px)',
                  overflow: 'auto',
                }}
              >
                {selectedItem.text}
              </div>
            )}
          </div>

          {/* properties */}
          <div
            style={{
              flex: '0 0 auto',
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '5px',
                opacity: 0.9,
              }}
            >
              Properties
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr',
                gap: '5px 10px',
                opacity: 0.85,
              }}
            >
              <div style={{ opacity: 0.5 }}>Type</div>
              <div style={{ textTransform: 'capitalize' }}>
                {type === 'image-file' ? 'Image File' : type}
              </div>

              {type === 'file' && (
                <>
                  <div style={{ opacity: 0.5 }}>Name</div>
                  <div>{getFilename(txt)}</div>
                  <div style={{ opacity: 0.5 }}>Path</div>
                  <div style={{ wordBreak: 'break-all', opacity: 0.7 }}>{txt}</div>
                </>
              )}

              {type === 'image' && imageDimensions && (
                <>
                  <div style={{ opacity: 0.5 }}>Dimensions</div>
                  <div>{imageDimensions}</div>
                </>
              )}

              {type === 'color' && (
                <>
                  <div style={{ opacity: 0.5 }}>Value</div>
                  <div style={{ fontFamily: 'monospace' }}>{txt}</div>
                </>
              )}

              <div style={{ opacity: 0.5 }}>Copied</div>
              <div>{new Date(selectedItem.copiedAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )
    })()
  ) : (
    <div
      style={{
        display: 'flex',
        height: 'calc(100% - 16px)',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.4,
        fontSize: '13px',
      }}
    >
      Select an item to preview
    </div>
  )

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {TwoPanel ? (
        <TwoPanel left={leftPanel} right={rightPanel} style={{ flex: 1, minHeight: 0 }} />
      ) : (
        <div style={{ display: 'flex', width: '100%', flex: 1, minHeight: 0 }}>
          <div
            style={{
              flex: '1 1 50%',
              minWidth: 0,
              overflowY: 'auto',
              borderRight: '1px solid rgba(128,128,128,0.2)',
            }}
          >
            {leftPanel}
          </div>
          <div
            style={{
              flex: '1 1 50%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {rightPanel}
          </div>
        </div>
      )}

      {fileExists === false && (
        <div
          style={{
            padding: '7px 14px',
            fontSize: '12px',
            color: 'var(--color-danger, #e55)',
            background: 'rgba(220,50,50,0.08)',
            borderTop: '1px solid rgba(220,50,50,0.2)',
          }}
        >
          File not found — it may have been moved or deleted.
        </div>
      )}
    </div>
  )
}
