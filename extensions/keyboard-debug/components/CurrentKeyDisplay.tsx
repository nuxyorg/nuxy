const React = window.React

import type { KeyEvent } from '../types.ts'

interface Props {
  event: KeyEvent | null
  emptyLabel: string
  emptyHint: string
}

function formatCombo(event: KeyEvent): string {
  const keyName = event.key === ' ' ? 'Space' : event.key
  return [...event.modifiers, keyName].join(' + ')
}

export function CurrentKeyDisplay({ event, emptyLabel, emptyHint }: Props) {
  const { EmptyState } = window.UI || {}

  if (!event) {
    return EmptyState ? <EmptyState message={emptyLabel} hint={emptyHint} /> : null
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-6)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--font-xl)',
          fontFamily: 'var(--font-mono)',
          fontWeight: 'var(--font-semibold)',
          color: 'var(--color-accent)',
          letterSpacing: '0.05em',
          textAlign: 'center',
          wordBreak: 'break-all',
        }}
      >
        {formatCombo(event)}
      </div>
      <div
        style={{
          fontSize: 'var(--font-sm)',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
        }}
      >
        {event.code}
      </div>
    </div>
  )
}
