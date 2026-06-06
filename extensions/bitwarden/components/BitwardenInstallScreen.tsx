const React = window.React

import type { BitwardenStatus } from '../types.ts'

interface Props {
  status: BitwardenStatus
  activeTab: string
  onTabChange: (tab: string) => void
}

export function BitwardenInstallScreen({ status, activeTab, onTabChange }: Props) {
  const { Badge, Card, Icon, CodeBlock } = window.UI || {}
  const WizardSection = (window.UI as any)?.WizardSection

  return (
    <div
      style={{
        padding: 'var(--space-5)',
        fontSize: 'var(--font-sm)',
        lineHeight: 1.6,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
      }}
    >
      {WizardSection ? (
        <WizardSection icon={Icon && <Icon name="Lock" />} title="Bitwarden CLI Bulunamadı" />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {Icon && <Icon name="Lock" style={{ width: 'var(--icon-md)', height: 'var(--icon-md)' }} />}
          <h2 style={{ margin: 0, fontSize: 'var(--font-lg)', fontWeight: 'var(--font-semibold)' }}>
            Bitwarden CLI Bulunamadı
          </h2>
        </div>
      )}
      <p style={{ opacity: 0.85, margin: 0 }}>
        Nuxy Bitwarden eklentisi, şifrelerinize güvenli bir şekilde erişmek için arka planda{' '}
        <code>rbw</code> (Rust tabanlı Bitwarden CLI istemcisi) aracını kullanır. Lütfen devam
        etmeden önce rbw'yi kurun.
      </p>

      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--syntax-comment)',
          gap: 'var(--space-3)',
          paddingBottom: 'var(--space-2)',
          marginTop: 'var(--space-2)',
        }}
      >
        {(['arch', 'debian', 'macos'] as const).map((tab) => (
          <div
            key={tab}
            onClick={() => onTabChange(tab)}
            style={{
              padding: 'var(--space-1) var(--space-2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-sm)',
              opacity: activeTab === tab ? 1 : 0.5,
              fontWeight: activeTab === tab ? 'var(--font-semibold)' : undefined,
              borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : undefined,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              cursor: 'pointer',
            }}
          >
            {tab === 'arch'
              ? 'Arch Linux / CachyOS'
              : tab === 'debian'
                ? 'Ubuntu / Debian'
                : 'macOS'}
            {status.os === tab && Badge && <Badge active>Sisteminiz</Badge>}
          </div>
        ))}
      </div>

      {Card && (
        <Card
          style={{
            padding: 'var(--space-5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          {activeTab === 'arch' && (
            <>
              <strong>Arch Linux / CachyOS için Kurulum:</strong>
              <p style={{ margin: 0, opacity: 0.8 }}>
                Depolarda bulunan <code>rbw</code> ve şifre sorması için <code>pinentry</code>{' '}
                paketlerini kurun:
              </p>
              {CodeBlock && <CodeBlock code="sudo pacman -S rbw pinentry" language="sh" />}
            </>
          )}

          {activeTab === 'debian' && (
            <>
              <strong>Ubuntu / Debian için Kurulum:</strong>
              <p style={{ margin: 0, opacity: 0.8 }}>
                <code>apt</code> kullanarak <code>rbw</code> paketini kurun:
              </p>
              {CodeBlock && <CodeBlock code="sudo apt install rbw" language="sh" />}
            </>
          )}

          {activeTab === 'macos' && (
            <>
              <strong>macOS için Kurulum:</strong>
              <p style={{ margin: 0, opacity: 0.8 }}>
                <code>Homebrew</code> kullanarak <code>rbw</code> paketini kurun:
              </p>
              {CodeBlock && <CodeBlock code="brew install rbw" language="sh" />}
            </>
          )}
        </Card>
      )}

      <div style={{ opacity: 0.6, fontSize: 'var(--font-xs)', marginTop: 'var(--space-2)' }}>
        Kurulumu tamamladıktan sonra ↵ tuşuna basın.
      </div>
    </div>
  )
}
