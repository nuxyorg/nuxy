const React = window.React

interface Props {
  emailInput: string
  isConfiguring: boolean
  errorMsg: string
  onEmailChange: (value: string) => void
}

export function BitwardenConfigScreen({ emailInput, isConfiguring, errorMsg, onEmailChange }: Props) {
  const { Card, Input, Alert, IconUser } = window.UI || {}
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
      }}
    >
      {WizardSection ? (
        <WizardSection icon={IconUser && <IconUser />} title="Bitwarden Hesabınızı Bağlayın" />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {IconUser && <IconUser style={{ width: 'var(--icon-md)', height: 'var(--icon-md)' }} />}
          <h2 style={{ margin: 0, fontSize: 'var(--font-lg)', fontWeight: 'var(--font-semibold)' }}>
            Bitwarden Hesabınızı Bağlayın
          </h2>
        </div>
      )}
      <p style={{ opacity: 0.85, margin: 0 }}>
        Bitwarden hesabınıza ait e-posta adresini girin. Bu adres yerel bilgisayarınızdaki{' '}
        <code>rbw</code> konfigürasyon dosyasına kaydedilecektir.
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label style={{ fontWeight: 'var(--font-semibold)' }}>Bitwarden E-posta Adresi:</label>
            {Input && (
              <Input
                type="email"
                placeholder="ornek@alanadi.com"
                value={emailInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEmailChange(e.target.value)}
                disabled={isConfiguring}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            )}
          </div>

          {errorMsg && Alert && <Alert variant="danger">{errorMsg}</Alert>}

          <div style={{ opacity: 0.6, fontSize: 'var(--font-xs)' }}>
            {isConfiguring ? 'Kaydediliyor...' : '↵ Kaydet · Esc İptal'}
          </div>
        </Card>
      )}
    </div>
  )
}
