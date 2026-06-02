const React = window.React
const { useState, useEffect, useCallback, useRef } = React

import type { ProcessInfo } from './types.ts'

const EXT_ID = 'com.nuxy.prockill'

interface Props {
  query: string
}

export default function ProcKillView({ query }: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState, Alert } =
    window.UI || {}

  const _useListNavigation =
    (window.UI || {}).useListNavigation ||
    (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))

  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  const _useTranslation =
    (window.UI || {}).useTranslation ||
    (() => ({ t: (k: string) => k, locale: 'en', dir: 'ltr' as const }))

  const { t, dir } = _useTranslation(EXT_ID)

  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const [killError, setKillError] = useState<string | null>(null)

  // Keep a ref to avoid stale closures in key handlers
  const processesRef = useRef<ProcessInfo[]>(processes)
  useEffect(() => {
    processesRef.current = processes
  }, [processes])

  const loadProcesses = useCallback((): void => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'listProcesses', { query })
      .then((res) => {
        const r = res as { success: boolean; data?: ProcessInfo[] } | null
        if (r?.success) {
          setProcesses(r.data || [])
        }
      })
      .catch(() => {})
  }, [query])

  // Load on mount with empty query
  useEffect(() => {
    loadProcesses()
  }, [])

  // Debounce reload when query changes (300ms — ps aux is expensive)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProcesses()
    }, 300)
    return () => clearTimeout(timer)
  }, [query, loadProcesses])

  const handleKill = useCallback(
    (proc: ProcessInfo, signal: 'SIGTERM' | 'SIGKILL'): void => {
      if (!window.core?.ipc?.invoke) return
      window.core.ipc
        .invoke(EXT_ID, 'killProcess', { pid: proc.pid, signal })
        .then((res) => {
          const r = res as { success: boolean; data?: { success: boolean; error?: string } } | null
          if (r?.success && r?.data?.success) {
            loadProcesses()
          } else {
            const errorMsg = r?.data?.error || t('errors.killFailed')
            setKillError(errorMsg)
            setTimeout(() => setKillError(null), 3000)
          }
        })
        .catch(() => {
          setKillError(t('errors.killFailed'))
          setTimeout(() => setKillError(null), 3000)
        })
    },
    [loadProcesses, t]
  )

  const { selectedIndex, setSelectedIndex } = _useListNavigation(processes, {
    onEnter: (item: ProcessInfo) => handleKill(item, 'SIGTERM'),
    enterLabel: t('actions.kill'),
    enterHint: '↵',
    extraActions: [
      {
        key: 'Enter',
        modifiers: ['shift'],
        label: t('actions.forceKill'),
        hint: ['⇧', '↵'],
        activeOn: () => selectedIndex >= 0,
        handler: () => {
          if (selectedIndex >= 0) handleKill(processesRef.current[selectedIndex], 'SIGKILL')
        },
      },
    ],
  })

  // R key: refresh list (always active)
  _useToolKeyActions([
    {
      key: 'r',
      label: t('actions.refresh'),
      hint: 'R',
      handler: () => loadProcesses(),
    },
  ])

  // Dispatch nuxy-key-hints-changed when selectedIndex changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex])

  return (
    <div style={{ direction: dir }}>
      {killError &&
        (Alert ? (
          <Alert variant="error">{killError}</Alert>
        ) : (
          <div
            style={{
              padding: 'var(--space-3) var(--space-5)',
              fontSize: 'var(--font-sm)',
              color: 'var(--color-danger)',
              background: 'var(--color-danger-bg)',
              borderBottom: 'var(--space-px) solid var(--color-danger-border)',
            }}
          >
            {killError}
          </div>
        ))}

      {processes.length === 0 ? (
        EmptyState && (
          <EmptyState
            message={query ? t('noResults') : t('empty')}
            hint={query ? t('noResultsHint') : t('emptyHint')}
          />
        )
      ) : (
        List && (
          <List>
            {processes.map((proc, idx) => (
              <ListItem
                key={proc.pid}
                active={idx === selectedIndex}
                onClick={() => setSelectedIndex(idx)}
              >
                <ListItemBody>
                  <ListItemText>{proc.name}</ListItemText>
                  <ListItemMeta>
                    {proc.pid} | {proc.cpu}% | {proc.mem}%
                  </ListItemMeta>
                </ListItemBody>
              </ListItem>
            ))}
          </List>
        )
      )}
    </div>
  )
}
