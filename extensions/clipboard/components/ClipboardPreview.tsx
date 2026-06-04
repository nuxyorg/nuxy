const React = window.React

import type { ClipboardItem } from '../types.ts'
import type { ItemType } from '../utils/itemType.ts'

interface Props {
  item: ClipboardItem
  type: ItemType
  txt: string
}

export function ClipboardPreview({ item, type, txt }: Props) {
  if (type === 'image') {
    return (
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
          src={item.image!}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          alt="Clipboard preview"
        />
      </div>
    )
  }

  if (type === 'color') {
    return (
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
    )
  }

  return (
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
      {item.text}
    </div>
  )
}
