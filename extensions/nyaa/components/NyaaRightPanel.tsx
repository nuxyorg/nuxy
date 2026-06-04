const React = window.React

import type { NyaaResult } from '../types.ts'

interface Props {
  item: NyaaResult | null
  copiedId: string | null
  multiSelectMode: boolean
  checkedCount: number
  t: (key: string) => string
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

export function NyaaRightPanel({ item, copiedId, multiSelectMode, checkedCount, t }: Props) {
  const PropertiesPanel = (window.UI as any)?.PropertiesPanel

  // Multi-select mode: show selection summary
  if (multiSelectMode) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-5)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 'var(--font-lg, 1.25rem)',
            fontWeight: 700,
            color: checkedCount > 0 ? 'var(--color-accent, var(--color-primary))' : 'inherit',
            opacity: checkedCount > 0 ? 1 : 0.4,
          }}
        >
          {checkedCount > 0
            ? t('item.selectedCount').replace('{count}', String(checkedCount))
            : t('item.selectPromptMulti')}
        </div>
        {checkedCount > 0 && (
          <div style={{ fontSize: 'var(--font-xs)', opacity: 0.5 }}>
            {t('item.multiSelectHint')}
          </div>
        )}
      </div>
    )
  }

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
        {t('item.selectPrompt')}
      </div>
    )
  }

  const isCopied = copiedId === item.id

  const statusValue =
    item.status === 'success'
      ? t('details.status.trusted')
      : item.status === 'danger'
        ? t('details.status.remake')
        : t('details.status.normal')

  const rows = [
    { label: t('details.category'), value: item.category },
    { label: t('details.size'), value: item.size },
    { label: t('details.date'), value: formatDate(item.date) },
    { label: t('details.seeders'), value: String(item.seeds) },
    { label: t('details.leechers'), value: String(item.leeches) },
    { label: t('details.status.label'), value: statusValue },
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
        {isCopied ? t('item.magnetCopied') : item.title}
      </div>

      {PropertiesPanel ? (
        <PropertiesPanel title={t('details.title')} rows={rows} />
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
