const React = window.React

import type { ClipboardItem } from '../types.ts'
import { getItemType, getFilename } from '../utils/itemType.ts'
import { ClipboardPreview } from './ClipboardPreview.tsx'

interface Props {
  item: ClipboardItem | null
  imageDimensions: string | null
}

export function ClipboardRightPanel({ item, imageDimensions }: Props) {
  const PropertiesPanel = (window.UI as any)?.PropertiesPanel

  if (!item) {
    return (
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
  }

  const type = getItemType(item)
  const txt = item.text?.trim() || ''

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
      <div
        style={{
          flex: '1 1 auto',
          overflowY: 'auto',
          marginBottom: 'var(--space-4)',
          minHeight: 0,
        }}
      >
        <ClipboardPreview item={item} type={type} txt={txt} />
      </div>

      <div style={{ flex: '0 0 auto' }}>
        {PropertiesPanel ? (
          <PropertiesPanel
            title="Properties"
            rows={[
              { label: 'Type', value: <span style={{ textTransform: 'capitalize' }}>{type}</span> },
              ...(type === 'file'
                ? [
                    { label: 'Name', value: getFilename(txt) },
                    {
                      label: 'Path',
                      value: <span style={{ wordBreak: 'break-all', opacity: 0.7 }}>{txt}</span>,
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
              { label: 'Copied', value: new Date(item.copiedAt).toLocaleString() },
            ]}
          />
        ) : (
          <PropertiesFallback item={item} type={type} txt={txt} imageDimensions={imageDimensions} />
        )}
      </div>
    </div>
  )
}

function PropertiesFallback({
  item,
  type,
  txt,
  imageDimensions,
}: {
  item: ClipboardItem
  type: string
  txt: string
  imageDimensions: string | null
}) {
  return (
    <div
      style={{
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
        <div style={{ textTransform: 'capitalize' }}>{type}</div>

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
        <div>{new Date(item.copiedAt).toLocaleString()}</div>
      </div>
    </div>
  )
}
