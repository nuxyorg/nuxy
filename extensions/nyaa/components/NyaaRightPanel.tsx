const React = window.React

import type { NyaaResult } from '../types.ts'

interface Props {
  item: NyaaResult | null
  copiedId: string | null
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function statusLabel(status: NyaaResult['status']): string {
  if (status === 'success') return 'Trusted'
  if (status === 'danger') return 'Remake'
  return 'Normal'
}

export function NyaaRightPanel({ item, copiedId }: Props) {
  const PropertiesPanel = (window.UI as any)?.PropertiesPanel

  if (!item) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: 0.4,
          fontSize: 'var(--font-sm)',
        }}
      >
        Select a result to view details
      </div>
    )
  }

  const isCopied = copiedId === item.id

  const rows = [
    { label: 'Category', value: item.category },
    { label: 'Size', value: item.size },
    { label: 'Date', value: formatDate(item.date) },
    { label: 'Seeders', value: String(item.seeds) },
    { label: 'Leechers', value: String(item.leeches) },
    { label: 'Status', value: statusLabel(item.status) },
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-5)',
        overflow: 'hidden',
        height: 'calc(100% - var(--space-6))',
        gap: 'var(--space-4)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--font-sm)',
          fontWeight: 600,
          lineHeight: 1.4,
          wordBreak: 'break-word',
          color: isCopied ? 'var(--color-success)' : 'inherit',
        }}
      >
        {isCopied ? 'Magnet copied!' : item.title}
      </div>

      {PropertiesPanel ? (
        <PropertiesPanel title="Details" rows={rows} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '90px 1fr',
            gap: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--font-sm)',
            opacity: 0.85,
          }}
        >
          {rows.map(({ label, value }) => (
            <React.Fragment key={label}>
              <div style={{ opacity: 0.5 }}>{label}</div>
              <div>{value}</div>
            </React.Fragment>
          ))}
        </div>
      )}

      <div
        style={{
          fontSize: 'var(--font-xs)',
          opacity: 0.35,
          wordBreak: 'break-all',
          overflow: 'hidden',
          maxHeight: '3em',
          fontFamily: 'monospace',
        }}
      >
        {item.magnet.slice(0, 100)}
        {item.magnet.length > 100 ? '…' : ''}
      </div>
    </div>
  )
}
