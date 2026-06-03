const React = window.React

import type { SavedColor } from '../types.ts'

interface Props {
  color: SavedColor
  t: (key: string) => string
}

export function ColorPreview({ color, t }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--space-4)',
        gap: 'var(--space-3)',
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: 'var(--radius-2)',
          backgroundColor: color.hex,
          flexShrink: 0,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {[
          { label: t('label.hex'), value: color.hex },
          { label: t('label.rgb'), value: color.rgb },
          { label: t('label.hsl'), value: color.hsl },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-1)',
              background: 'var(--surface-overlay)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
