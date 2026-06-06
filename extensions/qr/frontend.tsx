const React = window.React

import type { TypedInvoker } from '@nuxy/extension-sdk'
import type { IpcChannels } from './types.ts'
import { useQrData } from './hooks/useQrData.ts'

const EXT_ID = 'com.nuxy.qr'

import { _useToolKeyActions, _useTranslation } from '../ui-hooks.ts'

interface Props {
  query: string
}

export default function QrView({ query }: Props) {
  const { EmptyState } = window.UI || {}
  const { t, dir } = _useTranslation(EXT_ID)

  const { dataUrl, loading } = useQrData(query)

  const invoke: TypedInvoker<IpcChannels> = async (channel, ...args) => {
    const res = await window.core.ipc.invoke(EXT_ID, channel, args[0])
    const r = res as { success: boolean; data?: unknown; error?: string } | null
    if (!r?.success) throw new Error(r?.error ?? 'IPC failed')
    return r.data as never
  }

  const handleCopyText = React.useCallback(() => {
    if (!query.trim()) return
    invoke('qr:copyText', { text: query }).catch(() => {})
  }, [query])

  _useToolKeyActions([
    {
      key: 'Enter',
      label: t('action.copy'),
      hint: '↵',
      activeOn: () => !!query.trim(),
      handler: handleCopyText,
    },
    {
      key: 'c',
      label: t('action.copy'),
      hint: 'C',
      activeOn: () => !!query.trim(),
      handler: handleCopyText,
    },
  ])

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [query])

  if (!query.trim()) {
    return (
      <div style={{ direction: dir }}>
        {EmptyState ? (
          <EmptyState message={t('empty.placeholder')} />
        ) : (
          <div
            style={{
              padding: 'var(--space-6)',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
            }}
          >
            {t('empty.placeholder')}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        direction: dir,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        gap: 'var(--space-3)',
        flex: 1,
        minHeight: 0,
      }}
    >
      {loading && (
        <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
          {t('label.encoding')}...
        </div>
      )}
      {!loading && dataUrl && (
        <>
          <img
            src={dataUrl}
            alt={query}
            style={{
              display: 'block',
              maxWidth: '100%',
              imageRendering: 'pixelated',
              borderRadius: 'var(--radius-md)',
            }}
          />
          <div
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 'var(--font-size-sm)',
              textAlign: 'center',
              wordBreak: 'break-all',
              maxWidth: '320px',
            }}
          >
            {query}
          </div>
        </>
      )}
    </div>
  )
}
