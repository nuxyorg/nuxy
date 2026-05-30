const React = window.React

import type { ClipboardItem as ClipboardItemData } from './types.ts'

const EXT_ID = 'com.nuxy.clipboard'

interface Props {
  query: string
}

type ItemType = 'image' | 'color' | 'url' | 'file' | 'text'
type FileIconType = 'image-file' | 'pdf' | 'code' | 'archive' | 'document' | 'file'

// ── helpers ──────────────────────────────────────────────────────────────────

function getItemType(item: ClipboardItemData): ItemType {
  const txt = item.text?.trim() || ''
  if (item.image) return 'image'
  if (/^#([0-9a-f]{3,8})$/i.test(txt) || /^rgba?\(\s*[\d.]+/.test(txt) || /^hsla?\(/.test(txt))
    return 'color'
  if (/^https?:\/\//i.test(txt)) return 'url'
  if (/^(\/|~\/)/.test(txt) && txt.length > 2) return 'file'
  if (/^[a-zA-Z]:\\/.test(txt)) return 'file'
  return 'text'
}

function getFilename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() || path
}

function getParentDir(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  if (parts.length <= 1) return ''
  return parts.slice(0, -1).join('/').replace(/^\//, '')
}

function getFileExtension(path: string): string {
  const name = getFilename(path)
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
}

function getFileIconType(ext: string): FileIconType {
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

function FileIconFor({ ext }: { ext: string }) {
  const { IconImageFile, IconCode, IconDocument, IconPdf, IconArchive, IconFile } = window.UI || {}
  const t = getFileIconType(ext)
  if (t === 'image-file') return IconImageFile ? <IconImageFile /> : null
  if (t === 'code') return IconCode ? <IconCode /> : null
  if (t === 'document') return IconDocument ? <IconDocument /> : null
  if (t === 'pdf') return IconPdf ? <IconPdf /> : null
  if (t === 'archive') return IconArchive ? <IconArchive /> : null
  return IconFile ? <IconFile /> : null
}

// ── ItemLeading helper ────────────────────────────────────────────────────────

function ClipboardItemLeading({ item, type }: { item: ClipboardItemData; type: ItemType }) {
  const { ItemLeading } = window.UI || {}

  if (!ItemLeading) return null

  if (type === 'image') {
    return (
      <ItemLeading>
        <img
          src={item.image!}
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
    const { IconGlobe } = window.UI || {}
    return <ItemLeading>{IconGlobe && <IconGlobe />}</ItemLeading>
  }

  return null
}

// ── display helpers ───────────────────────────────────────────────────────────

function getListLabel(item: ClipboardItemData, type: ItemType, isCopied: boolean): string {
  if (isCopied) return 'Copied!'
  const txt = item.text?.trim() || ''
  if (type === 'image') return item.text && item.text !== 'Image' ? item.text : 'Image'
  if (type === 'file') return getFilename(txt)
  return txt
}

function getListMeta(
  item: ClipboardItemData,
  type: ItemType,
  isCurrent: boolean,
  timeAgo: (dateString: string) => string
): string {
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

export default function ClipboardView({ query }: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    EmptyState,
    TwoPanel,
    Alert,
    IconPin,
    PropertiesPanel,
  } = window.UI || {}

  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  const [items, setItems] = React.useState<ClipboardItemData[]>([])
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const [imageDimensions, setImageDimensions] = React.useState<string | null>(null)
  const [fileExists, setFileExists] = React.useState<boolean | null>(null)

  const searchQuery = query || ''

  const loadHistory = (): void => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'getHistory')
      .then((res) => {
        const r = res as { success: boolean; data?: ClipboardItemData[] } | null
        if (r?.success) {
          const newData = r.data || []
          setItems((prev) => {
            if (prev.length !== newData.length) return newData
            for (let i = 0; i < prev.length; i++) {
              if (prev[i].id !== newData[i].id) return newData
              if (prev[i].copiedAt !== newData[i].copiedAt) return newData
              if (prev[i].pinned !== newData[i].pinned) return newData
            }
            return prev
          })
        }
      })
      .catch(() => {})
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
    // Notify shell to re-evaluate which key-action hints are currently active
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
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
      ?.invoke(EXT_ID, 'checkFile', selectedItem!.text?.trim())
      .then((res) => {
        const r = res as { success: boolean; data?: boolean } | null
        if (r?.success) setFileExists(!!r.data)
      })
      .catch(() => setFileExists(false))
  }, [selectedIndex, filteredItems])

  const handleCopy = (id: string, eStop?: { stopPropagation: () => void }): void => {
    if (eStop) eStop.stopPropagation()
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'copyItem', id)
      .then((res) => {
        const r = res as { success: boolean; data?: ClipboardItemData[] } | null
        if (!r?.success) return
        setItems(r.data || [])
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 1800)
        setTimeout(() => window.core?.window?.hide?.(), 150)
      })
      .catch(() => {})
  }

  const handleCopyFile = (id: string, eStop?: { stopPropagation: () => void }): void => {
    if (eStop) eStop.stopPropagation()
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'copyFile', id)
      .then((res) => {
        const r = res as { success: boolean; data?: ClipboardItemData[] } | null
        if (!r?.success) return
        setItems(r.data || [])
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 1800)
        setTimeout(() => window.core?.window?.hide?.(), 150)
      })
      .catch(() => {})
  }

  const handlePin = (id: string, eStop?: { stopPropagation: () => void }): void => {
    if (eStop) eStop.stopPropagation()
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'pinItem', id)
      .then((res) => {
        const r = res as { success: boolean; data?: ClipboardItemData[] } | null
        if (r?.success) setItems(r.data || [])
      })
      .catch(() => {})
  }

  const handleUnpin = (id: string, eStop?: { stopPropagation: () => void }): void => {
    if (eStop) eStop.stopPropagation()
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'unpinItem', id)
      .then((res) => {
        const r = res as { success: boolean; data?: ClipboardItemData[] } | null
        if (r?.success) setItems(r.data || [])
      })
      .catch(() => {})
  }

  const handleDelete = (id: string, eStop?: { stopPropagation: () => void }): void => {
    if (eStop) eStop.stopPropagation()
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'deleteItem', id)
      .then((res) => {
        const r = res as { success: boolean; data?: ClipboardItemData[] } | null
        if (!r?.success) return
        const newItems = r.data || []
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
      .catch(() => {})
  }

  _useToolKeyActions([
    {
      key: 'ArrowUp',
      label: 'Navigate',
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
      hint: '↵',
      activeOn: () => selectedIndex >= 0,
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
      activeOn: () => selectedIndex >= 0,
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
      activeOn: () => selectedIndex >= 0,
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
      activeOn: () => selectedIndex >= 0,
      handler: () => {
        setSelectedIndex(-1)
      },
    },
    {
      key: 'p',
      label: 'Pin / Unpin',
      hint: 'P',
      activeOn: () => selectedIndex >= 0,
      handler: () => {
        const item = filteredItems[selectedIndex]
        if (!item) return
        if (item.pinned) handleUnpin(item.id)
        else handlePin(item.id)
      },
    },
  ])

  const timeAgo = (dateString: string): string => {
    if (!dateString) return ''
    const m = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000)
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
            >
              <ClipboardItemLeading item={item} type={type} />
              <ListItemBody>
                <ListItemText variant={isCopied ? 'success' : 'default'}>
                  {item.pinned && IconPin && (
                    <IconPin
                      size="14"
                      style={{
                        marginRight: 'var(--space-2)',
                        verticalAlign: 'middle',
                      }}
                    />
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
            padding: 'var(--space-5)',
            overflow: 'hidden',
            justifyContent: 'space-between',
            height: 'calc(100% - var(--space-6))',
          }}
        >
          {/* preview area */}
          <div
            style={{
              flex: '1 1 auto',
              overflowY: 'auto',
              marginBottom: 'var(--space-4)',
              minHeight: 0,
            }}
          >
            {type === 'image' ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-preview-bg, rgba(0, 0, 0, 0.2))',
                  padding: 'var(--space-3)',
                  overflow: 'hidden',
                  height: 'calc(100% - var(--space-5))',
                }}
              >
                <img
                  src={selectedItem.image!}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  alt="Clipboard preview"
                />
              </div>
            ) : type === 'color' ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  height: 'calc(100% - var(--space-5))',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    borderRadius: 'var(--radius-lg)',
                    background: txt,
                    border: 'var(--space-px) solid var(--color-border, rgba(255, 255, 255, 0.1))',
                    minHeight: '80px',
                  }}
                />
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 'var(--font-body)',
                    textAlign: 'center',
                    opacity: 0.85,
                    padding: 'var(--space-1)',
                  }}
                >
                  {txt}
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: 'var(--font-sm)',
                  lineHeight: 1.55,
                  opacity: 0.8,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: type === 'text' ? 'inherit' : 'monospace',
                  padding: 'var(--space-3)',
                  background: 'var(--color-preview-bg, rgba(0, 0, 0, 0.2))',
                  borderRadius: 'var(--radius-lg)',
                  height: 'calc(100% - var(--space-5))',
                  overflow: 'auto',
                }}
              >
                {selectedItem.text}
              </div>
            )}
          </div>

          {/* properties */}
          {PropertiesPanel ? (
            <div style={{ flex: '0 0 auto' }}>
              <PropertiesPanel
                title="Properties"
                rows={[
                  {
                    label: 'Type',
                    value: (
                      <span style={{ textTransform: 'capitalize' }}>
                        {type === 'image-file' ? 'Image File' : type}
                      </span>
                    ),
                  },
                  ...(type === 'file'
                    ? [
                        { label: 'Name', value: getFilename(txt) },
                        {
                          label: 'Path',
                          value: (
                            <span style={{ wordBreak: 'break-all', opacity: 0.7 }}>{txt}</span>
                          ),
                        },
                      ]
                    : []),
                  ...(type === 'image' && imageDimensions
                    ? [{ label: 'Dimensions', value: imageDimensions }]
                    : []),
                  ...(type === 'color'
                    ? [
                        {
                          label: 'Value',
                          value: <span style={{ fontFamily: 'monospace' }}>{txt}</span>,
                        },
                      ]
                    : []),
                  { label: 'Copied', value: new Date(selectedItem.copiedAt).toLocaleString() },
                ]}
              />
            </div>
          ) : (
            <div
              style={{
                flex: '0 0 auto',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--color-surface, rgba(255, 255, 255, 0.05))',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--font-sm)',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 'var(--space-3)',
                  borderBottom: 'var(--space-px) solid var(--color-border, rgba(255, 255, 255, 0.1))',
                  paddingBottom: 'var(--space-2)',
                  opacity: 0.9,
                }}
              >
                Properties
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr',
                  gap: 'var(--space-2) var(--space-4)',
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
          )}
        </div>
      )
    })()
  ) : (
    <div
      style={{
        display: 'flex',
        height: 'calc(100% - var(--space-4))',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.4,
        fontSize: 'var(--font-sm)',
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
              borderRight: 'var(--space-px) solid var(--color-border, rgba(128, 128, 128, 0.2))',
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

      {fileExists === false &&
        (Alert ? (
          <Alert variant="danger" style={{ borderRadius: 0 }}>
            File not found — it may have been moved or deleted.
          </Alert>
        ) : (
          <div
            style={{
              padding: 'var(--space-3) var(--space-5)',
              fontSize: 'var(--font-sm)',
              color: 'var(--color-danger, #e55)',
              background: 'var(--color-danger-bg, rgba(220, 50, 50, 0.08))',
              borderTop: 'var(--space-px) solid var(--color-danger-border, rgba(220, 50, 50, 0.2))',
            }}
          >
            File not found — it may have been moved or deleted.
          </div>
        ))}
    </div>
  )
}
