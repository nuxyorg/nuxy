const React = window.React
const { useState, useEffect, useCallback, useRef } = React

import type { Snippet } from './types.ts'

const EXT_ID = 'com.nuxy.snippets'

const _useListNavigation =
  (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))

const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

interface Props {
  query: string
}

interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  return window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
    const r = res as IpcResponse<T>
    if (!r?.success) throw new Error(r?.error || 'IPC failed')
    return r.data as T
  })
}

function timeAgo(dateString: string): string {
  if (!dateString) return ''
  const m = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function SnippetsView({ query }: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    EmptyState,
  } = window.UI || {}

  const { t, dir } = _useTranslation(EXT_ID)

  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadSnippets = useCallback((q?: string): void => {
    invoke<Snippet[]>('getSnippets', q ? { query: q } : {})
      .then(setSnippets)
      .catch(() => {})
  }, [])

  // Initial load and debounced search on query change
  useEffect(() => {
    if (!query) {
      loadSnippets()
      return
    }
    const timer = setTimeout(() => {
      loadSnippets(query)
    }, 150)
    return () => clearTimeout(timer)
  }, [query, loadSnippets])

  const handleCopy = useCallback(
    (item: Snippet): void => {
      invoke<{ copied: true }>('copySnippet', { id: item.id })
        .then(() => {
          if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
          setCopiedId(item.id)
          copiedTimerRef.current = setTimeout(() => setCopiedId(null), 1500)
          invoke<boolean>('getSettings').catch(() => {})
          // Check closeAfterCopy setting
          window.core.ipc
            .invoke(EXT_ID, 'getSettings')
            .then((res) => {
              const r = res as IpcResponse<{ closeAfterCopy: boolean }>
              if (r?.data?.closeAfterCopy !== false) {
                setTimeout(() => window.core?.window?.hide?.(), 200)
              }
            })
            .catch(() => {
              // default: hide after copy
              setTimeout(() => window.core?.window?.hide?.(), 200)
            })
        })
        .catch(() => {})
    },
    [],
  )

  const { selectedIndex, setSelectedIndex } = _useListNavigation(snippets, {
    onEnter: (item: Snippet) => handleCopy(item),
    enterLabel: t('actions.copy'),
    enterHint: '↵',
  })

  const handleSaveClipboard = useCallback((): void => {
    invoke<Snippet>('saveClipboardAsSnippet')
      .then(() => loadSnippets(query || undefined))
      .catch(() => {})
  }, [query, loadSnippets])

  const handleDelete = useCallback((): void => {
    const item = snippets[selectedIndex]
    if (!item) return
    invoke<Snippet[]>('deleteSnippet', { id: item.id })
      .then((updated) => {
        setSnippets(updated)
        setSelectedIndex((prev: number) => {
          if (updated.length === 0) return -1
          return Math.min(prev, updated.length - 1)
        })
      })
      .catch(() => {})
  }, [snippets, selectedIndex, setSelectedIndex])

  _useToolKeyActions([
    {
      key: 'Enter',
      label: t('actions.copy'),
      hint: '↵',
      activeOn: () => selectedIndex >= 0,
      handler: () => {
        const item = snippets[selectedIndex]
        if (item) handleCopy(item)
      },
    },
    {
      key: 'n',
      label: t('actions.saveClipboard'),
      hint: 'N',
      handler: handleSaveClipboard,
    },
    {
      key: 'd',
      label: t('actions.delete'),
      hint: 'D',
      activeOn: () => selectedIndex >= 0,
      handler: handleDelete,
    },
  ])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex])

  const hasQuery = Boolean(query)

  return (
    <div style={{ direction: dir, height: '100%', overflowY: 'auto' }}>
      {snippets.length === 0 ? (
        EmptyState && (
          <EmptyState
            message={hasQuery ? t('noResults') : t('empty')}
            hint={hasQuery ? t('noResultsHint') : t('emptyHint')}
          />
        )
      ) : (
        List && (
          <List>
            {snippets.map((snippet, idx) => {
              const isCopied = copiedId === snippet.id
              const isActive = idx === selectedIndex
              const meta = [
                snippet.tags.length > 0 ? snippet.tags.join(', ') : null,
                timeAgo(snippet.updatedAt),
              ]
                .filter(Boolean)
                .join(' · ')
              return (
                <ListItem
                  key={snippet.id}
                  active={isActive}
                  onClick={() => setSelectedIndex(idx)}
                >
                  <ListItemBody>
                    <ListItemText variant={isCopied ? 'success' : 'default'}>
                      {isCopied ? t('copied') : snippet.title}
                    </ListItemText>
                    <ListItemMeta>{meta}</ListItemMeta>
                  </ListItemBody>
                </ListItem>
              )
            })}
          </List>
        )
      )}
    </div>
  )
}
