const React = window.React

import type { BitwardenStatus } from '../types.ts'

interface Props {
  status: BitwardenStatus
  isUnlocking: boolean
  isSyncing: boolean
  unlockError: string
}

export function BitwardenLockScreen({ status, isUnlocking, isSyncing, unlockError }: Props) {
  const { Card, Alert, Icon, CodeBlock } = window.UI || {}
  const WizardSection = (window.UI as any)?.WizardSection

  return (
    <div
      style={{
        padding: 'var(--space-5)',
        fontSize: 'var(--font-sm)',
        lineHeight: 1.6,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
        overflowY: 'auto',
      }}
    >
      {WizardSection ? (
        <WizardSection icon={Icon && <Icon name="Lock" />} title="Bitwarden Kasanız Kilitli" />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {Icon && <Icon name="Lock" style={{ width: 'var(--icon-md)', height: 'var(--icon-md)' }} />}
          <h2 style={{ margin: 0, fontSize: 'var(--font-lg)', fontWeight: 'var(--font-semibold)' }}>
            Bitwarden Kasanız Kilitli
          </h2>
        </div>
      )}
      <p style={{ opacity: 0.85, margin: 0 }}>
        Hesabınız: <strong style={{ color: 'var(--syntax-function)' }}>{status.email}</strong>
      </p>

      {Card && (
        <Card
          style={{
            padding: 'var(--space-5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-5)',
          }}
        >
          <div>
            <p style={{ margin: 0, opacity: 0.8 }}>
              Kasanın kilidini açmak için aşağıdaki butona basın. Bilgisayarınızda bir şifre giriş
              penceresi (Pinentry) açılacaktır:
            </p>
          </div>

          {isUnlocking && Alert && (
            <Alert variant="info">
              Masaüstünüzde şifre giriş penceresi açıldı. Lütfen Bitwarden ana şifrenizi girin.
            </Alert>
          )}

          {unlockError && Alert && <Alert variant="danger">{unlockError}</Alert>}

          <div style={{ opacity: 0.6, fontSize: 'var(--font-xs)' }}>
            {isUnlocking
              ? 'Şifre bekleniyor...'
              : isSyncing
                ? 'Eşitleniyor...'
                : '↵ Kilit Aç · ⌃S Eşitle · ⌃R Yenile'}
          </div>
        </Card>
      )}

      <div style={{ marginTop: 'var(--space-2)' }}>
        <p style={{ opacity: 0.7, margin: 0 }}>
          Alternatif olarak, terminaliniz üzerinden de kilidi açabilirsiniz:
        </p>
        {CodeBlock && <CodeBlock code="rbw unlock" language="sh" />}
      </div>
    </div>
  )
}
