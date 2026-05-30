const React = window.React
const { useState, useEffect, useRef, useCallback, useLayoutEffect } = React

import type { AngrysearchItem, DbStatus } from './types.ts'

const EXT_ID = 'com.nuxy.angrysearch'

const _useListNavigation =
  (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))

interface Props {
  query: string
}

export default function AngrysearchView({ query }: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    EmptyState,
    ShortcutSep,
    IconFolder,
    IconFile,
  } = window.UI || {}

  const [items, setItems] = useState<AngrysearchItem[]>([])
  const [regexMode, setRegexMode] = useState<boolean>(false)
  const [status, setStatus] = useState<DbStatus | null>(null)

  const searchQuery = query || ''

  const selectedIndexRef = useRef<number>(-1)

  const handleOpen = (item: AngrysearchItem): void => {
    if (!window.core?.ipc?.invoke || !item) return
    window.core.ipc.invoke(EXT_ID, 'openFile', item.value).catch(() => {})
  }

  const handleOpenLocation = (item: AngrysearchItem): void => {
    if (!window.core?.ipc?.invoke || !item) return
    window.core.ipc.invoke(EXT_ID, 'openLocation', item.value).catch(() => {})
  }

  const { selectedIndex, setSelectedIndex } = _useListNavigation(items, {
    onEnter: (item: AngrysearchItem) => handleOpen(item),
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
        handler: () => setRegexMode((m: boolean) => !m),
      },
    ],
  })

  useLayoutEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'getStatus')
      .then((res) => {
        const r = res as { success?: boolean; data?: DbStatus } | null
        if (r?.success) setStatus(r.data ?? null)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    if (searchQuery.trim().length < 3) {
      setItems([])
      return
    }

    const timer = setTimeout(() => {
      window.core.ipc
        .invoke(EXT_ID, 'search', { query: searchQuery, regex: regexMode })
        .then((res) => {
          const r = res as { success?: boolean; data?: { items: AngrysearchItem[] } } | null
          if (r?.success) {
            const newItems = r.data?.items || []
            setItems(newItems)
            setSelectedIndex(newItems.length > 0 ? 0 : -1)
          }
        })
        .catch(() => {})
    }, 150)

    return () => clearTimeout(timer)
  }, [searchQuery, regexMode])

  const triggerUpdate = useCallback((): void => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc.invoke(EXT_ID, 'updateDatabase').then(() => {
      setStatus((prev) => (prev ? { ...prev, isUpdating: true } : prev))
    })
  }, [])

  useEffect(() => {
    const actions = [
      { id: 'update-db', label: 'Update Database', onExecute: triggerUpdate },
      {
        id: 'toggle-regex',
        label: 'Toggle Regex Mode',
        onExecute: () => setRegexMode((m: boolean) => !m),
      },
    ]
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
  }, [triggerUpdate])

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('nuxy-shell-footer-hints', {
        detail: (
          <>
            <span style={{ color: regexMode ? 'var(--color-danger)' : 'var(--text-muted)' }}>
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
      })
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
          hint={searchQuery.length < 3 ? 'Enter at least 3 characters.' : 'Try a different search.'}
        />
      ) : (
        items.map((item, idx) => {
          const isActive = idx === selectedIndex
          return (
            <ListItem key={item.id} active={isActive}>
              <ListItemBody>
                <ListItemText>
                  {item.isDir
                    ? IconFolder && (
                        <IconFolder
                          style={{
                            width: '1em',
                            height: '1em',
                            marginRight: 'var(--space-1)',
                            verticalAlign: 'middle',
                          }}
                        />
                      )
                    : IconFile && (
                        <IconFile
                          style={{
                            width: '1em',
                            height: '1em',
                            marginRight: 'var(--space-1)',
                            verticalAlign: 'middle',
                          }}
                        />
                      )}
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
