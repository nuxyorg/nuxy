const React = window.React
const { useState, useEffect, useMemo, useCallback } = React

import type { TimerStatus, Session } from './types.ts'

const EXT_ID = 'com.nuxy.focusblock'

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

function parseQuery(
  query: string,
  defaultDuration: number,
): { duration: number; label: string } {
  const trimmed = query.trim()
  if (!trimmed) return { duration: defaultDuration, label: '' }
  const parts = trimmed.split(/\s+/)
  const firstNum = parseInt(parts[0], 10)
  if (!isNaN(firstNum) && firstNum > 0 && firstNum <= 480) {
    return { duration: firstNum, label: parts.slice(1).join(' ') }
  }
  return { duration: defaultDuration, label: trimmed }
}

function formatMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000)
  return `${min}m`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function FocusBlock({ query }: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    EmptyState,
    SectionHeader,
    CircularProgress,
  } = window.UI || {}

  const { t, dir } = _useTranslation(EXT_ID)

  const [status, setStatus] = useState<TimerStatus | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [defaultDuration, setDefaultDuration] = useState(25)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const active = status?.active ?? false
  const { duration, label } = parseQuery(query, defaultDuration)

  const refreshStatus = useCallback(() => {
    invoke<TimerStatus>('focusblock:status').then(setStatus).catch(() => {})
  }, [])

  const refreshHistory = useCallback(() => {
    invoke<Session[]>('focusblock:history').then(setSessions).catch(() => {})
  }, [])

  useEffect(() => {
    refreshStatus()
    refreshHistory()
    invoke<{ defaultDuration: number }>('focusblock:getSettings')
      .then((s) => setDefaultDuration(s.defaultDuration))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!active) return
    const id = setInterval(refreshStatus, 1000)
    return () => clearInterval(id)
  }, [active])

  useEffect(() => {
    if (status && !status.active) {
      refreshHistory()
    }
  }, [status?.active])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [active, selectedIndex])

  const handleStart = useCallback(() => {
    invoke<TimerStatus>('focusblock:start', { duration, label })
      .then(setStatus)
      .catch(() => {})
  }, [duration, label])

  const handleStop = useCallback(() => {
    invoke('focusblock:stop')
      .then(() => {
        refreshStatus()
        refreshHistory()
      })
      .catch(() => {})
  }, [])

  const keyActions = useMemo(
    () => [
      {
        key: 'Enter',
        label: active ? t('actions.stop') : t('actions.start'),
        hint: '↵',
        handler: () => {
          if (active) handleStop()
          else handleStart()
        },
      },
      {
        key: 's',
        label: t('actions.stop'),
        hint: 'S',
        activeOn: () => active,
        handler: handleStop,
      },
      {
        key: 'ArrowUp',
        label: t('actions.prev'),
        activeOn: () => !active && sessions.length > 0,
        handler: () => setSelectedIndex((i) => Math.max(-1, i - 1)),
      },
      {
        key: 'ArrowDown',
        label: t('actions.next'),
        hint: '↑↓',
        activeOn: () => !active && sessions.length > 0,
        handler: () => setSelectedIndex((i) => Math.min(sessions.length - 1, i + 1)),
      },
    ],
    [active, sessions.length, handleStart, handleStop, t],
  )

  _useToolKeyActions(keyActions)

  if (active && status) {
    return (
      <div
        style={{
          direction: dir,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 'var(--space-4)',
          padding: 'var(--space-5)',
        }}
      >
        {CircularProgress && (
          <CircularProgress value={status.percent} size={120} strokeWidth={8} showLabel={false} />
        )}
        <span
          style={{
            fontSize: 'var(--font-xl)',
            fontWeight: 'bold',
            color: 'var(--text)',
            letterSpacing: '0.05em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatMs(status.remaining)}
        </span>
        {status.label && (
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
            {status.label}
          </span>
        )}
      </div>
    )
  }

  return (
    <div style={{ direction: dir, height: '100%', overflowY: 'auto' }}>
      {sessions.length === 0 ? (
        EmptyState && (
          <EmptyState
            message={t('idle.message', { duration: String(duration), label: label || '' })}
            hint={t('idle.hint')}
          />
        )
      ) : (
        <>
          {SectionHeader && <SectionHeader label={t('sections.recent')} />}
          {List && (
            <List>
              {sessions.map((s, i) => (
                <ListItem key={s.id} active={i === selectedIndex}>
                  <ListItemBody>
                    <ListItemText>{s.label || t('session.untitled')}</ListItemText>
                    <ListItemMeta>
                      {formatDuration(s.duration)}
                      {' · '}
                      {s.completed ? t('session.completed') : t('session.stopped')}
                      {' · '}
                      {formatDate(s.endedAt)}
                    </ListItemMeta>
                  </ListItemBody>
                </ListItem>
              ))}
            </List>
          )}
        </>
      )}
    </div>
  )
}
