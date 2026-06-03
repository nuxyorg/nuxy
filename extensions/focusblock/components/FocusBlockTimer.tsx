const React = window.React

import type { TimerStatus } from '../types.ts'
import { formatMs } from '../utils/formatters.ts'

interface Props {
  status: TimerStatus
  dir: 'ltr' | 'rtl'
}

export function FocusBlockTimer({ status, dir }: Props) {
  const { CircularProgress } = window.UI || {}

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
