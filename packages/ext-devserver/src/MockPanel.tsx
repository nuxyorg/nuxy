import React, { useState, useEffect, useRef } from 'react' // React used by classic JSX
import {
  ipcLog,
  runtimeMocks,
  setMock,
  clearMock,
  type LogEntry,
  type MockSource,
} from './mock-core'

const SOURCE_BADGE: Record<MockSource, { label: string; color: string; bg: string }> = {
  ui: { label: 'ui', color: '#60b4ff', bg: 'rgba(80,160,255,0.15)' },
  backend: { label: 'backend', color: '#7be07b', bg: 'rgba(80,200,80,0.12)' },
  file: { label: 'file', color: '#f0b860', bg: 'rgba(240,184,80,0.12)' },
  null: { label: 'null', color: '#ff7070', bg: 'rgba(255,80,80,0.1)' },
}

const S = {
  panel: {
    width: '680px',
    background: '#0e0e16',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '8px',
    overflow: 'hidden',
    fontFamily: 'ui-monospace, "Cascadia Code", monospace',
    fontSize: '12px',
  } as React.CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.03)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer',
    userSelect: 'none',
  } as React.CSSProperties,

  row: {
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    padding: '8px 12px',
  } as React.CSSProperties,

  channelLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '5px',
  } as React.CSSProperties,

  textarea: {
    width: '100%',
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    color: '#d4e0f0',
    fontFamily: 'inherit',
    fontSize: '11px',
    padding: '5px 8px',
    resize: 'vertical' as const,
    minHeight: '52px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    width: '100%',
  } as React.CSSProperties,

  btn: (variant: 'apply' | 'clear' | 'add') =>
    ({
      padding: '2px 8px',
      borderRadius: '3px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '10px',
      fontFamily: 'inherit',
      fontWeight: 600,
      background:
        variant === 'apply'
          ? 'rgba(80,160,255,0.2)'
          : variant === 'clear'
            ? 'rgba(255,80,80,0.15)'
            : 'rgba(255,255,255,0.08)',
      color:
        variant === 'apply' ? '#60b4ff' : variant === 'clear' ? '#ff7070' : 'rgba(255,255,255,0.6)',
    }) as React.CSSProperties,

  addRow: {
    display: 'flex',
    gap: '6px',
    padding: '8px 12px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    alignItems: 'center',
  } as React.CSSProperties,

  addInput: {
    flex: 1,
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    color: '#d4e0f0',
    fontFamily: 'inherit',
    fontSize: '11px',
    padding: '4px 8px',
    outline: 'none',
  } as React.CSSProperties,
}

interface MockRowProps {
  channel: string
  lastEntry: LogEntry | undefined
  onRemove: () => void
}

function MockRow({ channel, lastEntry, onRemove }: MockRowProps) {
  const isActive = Object.prototype.hasOwnProperty.call(runtimeMocks, channel)
  const initialJson = isActive
    ? JSON.stringify(runtimeMocks[channel], null, 2)
    : lastEntry !== undefined
      ? JSON.stringify(lastEntry.data, null, 2)
      : ''

  const [draft, setDraft] = useState(initialJson)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState(isActive)

  function apply() {
    try {
      const parsed = JSON.parse(draft)
      setMock(channel, parsed)
      setError('')
      setApplied(true)
    } catch {
      setError('Invalid JSON')
    }
  }

  function handleClear() {
    clearMock(channel)
    setApplied(false)
    onRemove()
  }

  const hasChanges = applied
    ? JSON.stringify(runtimeMocks[channel], null, 2) !== draft
    : draft !== ''

  return (
    <div style={S.row}>
      <div style={S.channelLabel}>
        <span style={{ color: applied ? '#60b4ff' : 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
          {channel}
        </span>
        {lastEntry && (
          <>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>
              {new Date(lastEntry.ts).toLocaleTimeString()}
            </span>
            {(() => {
              const b = SOURCE_BADGE[lastEntry.source]
              return (
                <span
                  style={{
                    fontSize: '10px',
                    color: b.color,
                    background: b.bg,
                    padding: '1px 5px',
                    borderRadius: '3px',
                  }}
                >
                  {b.label}
                </span>
              )
            })()}
          </>
        )}
        {applied && (
          <span
            style={{
              color: '#60b4ff',
              fontSize: '10px',
              background: 'rgba(80,160,255,0.1)',
              padding: '1px 5px',
              borderRadius: '3px',
            }}
          >
            active
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button style={S.btn('clear')} onClick={handleClear}>
          remove
        </button>
        <button style={{ ...S.btn('apply'), opacity: hasChanges ? 1 : 0.4 }} onClick={apply}>
          apply
        </button>
      </div>
      <textarea
        style={{
          ...S.textarea,
          borderColor: error
            ? 'rgba(255,80,80,0.4)'
            : applied
              ? 'rgba(80,160,255,0.25)'
              : 'rgba(255,255,255,0.1)',
        }}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          setError('')
        }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') apply()
        }}
        spellCheck={false}
        rows={Math.min(8, Math.max(2, draft.split('\n').length))}
      />
      {error && <div style={{ color: '#ff7070', fontSize: '10px', marginTop: '3px' }}>{error}</div>}
      {!error && (
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', marginTop: '3px' }}>
          Ctrl+Enter to apply
        </div>
      )}
    </div>
  )
}

export default function MockPanel() {
  const [open, setOpen] = useState(true)
  const [channels, setChannels] = useState<string[]>([])
  const [newChannel, setNewChannel] = useState('')
  const [, setTick] = useState(0)
  const addInputRef = useRef<HTMLInputElement>(null)

  // Sync channels from ipcLog (unique non-kernel) + active runtime mocks
  useEffect(() => {
    const id = setInterval(() => {
      setChannels((prev) => {
        const seen = new Set(prev)
        for (const e of ipcLog) {
          if (e.extId !== 'kernel') seen.add(e.channel)
        }
        for (const k of Object.keys(runtimeMocks)) seen.add(k)
        const next = [...seen]
        return next.length !== prev.length ? next : prev
      })
      setTick((t) => t + 1) // refresh timestamps
    }, 800)
    return () => clearInterval(id)
  }, [])

  function addChannel() {
    const ch = newChannel.trim()
    if (!ch) return
    setChannels((prev) => (prev.includes(ch) ? prev : [...prev, ch]))
    setNewChannel('')
    addInputRef.current?.focus()
  }

  const activeCount = Object.keys(runtimeMocks).length

  return (
    <div style={S.panel}>
      <div style={S.header} onClick={() => setOpen((v) => !v)}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
          {open ? '▼' : '▶'} Mocks
          {activeCount > 0 && (
            <span
              style={{
                marginLeft: '8px',
                color: '#60b4ff',
                fontSize: '10px',
                background: 'rgba(80,160,255,0.12)',
                padding: '1px 6px',
                borderRadius: '10px',
              }}
            >
              {activeCount} active
            </span>
          )}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>
          {channels.length} channel{channels.length !== 1 ? 's' : ''} seen
        </span>
      </div>

      {open && (
        <>
          {channels.length === 0 && (
            <div
              style={{ padding: '16px 12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}
            >
              No IPC calls yet — interact with the extension above.
            </div>
          )}

          {channels.map((ch) => (
            <MockRow
              key={ch}
              channel={ch}
              lastEntry={[...ipcLog].reverse().find((e) => e.channel === ch)}
              onRemove={() => setChannels((prev) => prev.filter((c) => c !== ch))}
            />
          ))}

          <div style={S.addRow}>
            <input
              ref={addInputRef}
              style={S.addInput}
              placeholder="channel name (e.g. getHistory)"
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addChannel()}
            />
            <button style={S.btn('add')} onClick={addChannel}>
              + add
            </button>
          </div>
        </>
      )}
    </div>
  )
}
