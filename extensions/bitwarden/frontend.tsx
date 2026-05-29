const React = window.React
const { useState, useEffect, useRef, useCallback } = React

import type { BitwardenStatus, BitwardenItem } from './types.ts'

const EXT_ID = 'com.nuxy.bitwarden'

const _useListNavigation =
  (window.UI as { useListNavigation?: any } | undefined)?.useListNavigation ?? null

const ipc = async (channel: string, payload?: unknown): Promise<unknown> => {
  const res = (await window.core.ipc.invoke(EXT_ID, channel, payload)) as {
    success?: boolean
    data?: unknown
    error?: string
  } | null
  if (res && res.success) {
    return res.data
  }
  throw new Error(res?.error || 'IPC call failed')
}

interface Props {
  query: string
}

export default function BitwardenView({ query }: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    ListItemActions,
    Button,
    EmptyState,
    Card,
    Input,
    Badge,
    Alert,
    IconLock,
    IconUser,
  } = window.UI || {}

  const [status, setStatus] = useState<BitwardenStatus | null>(null)
  const [results, setResults] = useState<BitwardenItem[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { selectedIndex, setSelectedIndex } = _useListNavigation
    ? _useListNavigation(results, {
        onEnter: (item: BitwardenItem) => copyPassword(item),
        enterLabel: 'Şifreyi Kopyala',
        enterHint: 'Enter',
        extraActions: [
          {
            key: 'Enter',
            modifiers: ['shift'],
            label: 'Kullanıcı Adını Kopyala',
            hint: ['⇧', 'Enter'],
            activeOn: () => selectedIndex >= 0,
            handler: () => {
              const item = results[selectedIndex]
              if (item) copyUsername(item)
            },
          },
          {
            key: 'Enter',
            modifiers: ['ctrl'],
            label: 'TOTP Kopyala',
            hint: ['Ctrl', 'Enter'],
            activeOn: () => selectedIndex >= 0,
            handler: () => {
              const item = results[selectedIndex]
              if (item) copyTotp(item)
            },
          },
        ],
      })
    : { selectedIndex: -1, setSelectedIndex: () => {} }

  useEffect(() => {
    setSelectedIndex(-1)
  }, [results, setSelectedIndex])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex, results])

  // Wizard state
  const [activeTab, setActiveTab] = useState<string>('arch')
  const [emailInput, setEmailInput] = useState<string>('')
  const [isConfiguring, setIsConfiguring] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [editingEmail, setEditingEmail] = useState<boolean>(false)

  // Unlock state
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [unlockError, setUnlockError] = useState<string>('')

  const refreshStatus = useCallback((): void => {
    ipc('bw:status')
      .then((res) => {
        const s = res as BitwardenStatus
        setStatus(s)
        if (s?.email && !emailInput) {
          setEmailInput(s.email)
        }
      })
      .catch(() =>
        setStatus({
          backend: 'none',
          installed: false,
          configured: false,
          locked: true,
          os: 'linux',
        })
      )
  }, [emailInput])

  useEffect(() => {
    refreshStatus()
  }, [])

  useEffect(() => {
    if (status?.os) {
      if (status.os === 'arch' || status.os === 'debian' || status.os === 'macos') {
        setActiveTab(status.os)
      } else {
        setActiveTab('arch')
      }
    }
  }, [status?.os])

  const search = useCallback((q: string): void => {
    ipc('bw:search', { query: q })
      .then((res) => setResults(res as BitwardenItem[]))
      .catch(() => setResults([]))
  }, [])

  useEffect(() => {
    if (status && status.installed && status.configured && !status.locked) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => search(query || ''), 200)
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search, status])

  const flash = (id: string): void => {
    setCopiedId(id)
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800)
  }

  const copyPassword = (item: BitwardenItem): void => {
    ipc('bw:copyPassword', item)
      .then(() => flash(`${item.id}-pw`))
      .catch(console.error)
  }

  const copyUsername = (item: BitwardenItem): void => {
    ipc('bw:copyUsername', item)
      .then(() => flash(`${item.id}-un`))
      .catch(console.error)
  }

  const copyTotp = (item: BitwardenItem): void => {
    ipc('bw:getTotp', item)
      .then((res) => ipc('bw:copyTotp', { code: (res as { code: string }).code }))
      .then(() => flash(`${item.id}-otp`))
      .catch(console.error)
  }

  const handleSaveEmail = (): void => {
    if (!emailInput) {
      setErrorMsg('Lütfen geçerli bir e-posta adresi girin.')
      return
    }
    setIsConfiguring(true)
    setErrorMsg('')
    ipc('bw:setEmail', { email: emailInput })
      .then(() => {
        setIsConfiguring(false)
        setEditingEmail(false)
        refreshStatus()
      })
      .catch((err: Error) => {
        setIsConfiguring(false)
        setErrorMsg(err.message || 'E-posta yapılandırılamadı.')
      })
  }

  const handleUnlock = (): void => {
    setIsUnlocking(true)
    setUnlockError('')
    ipc('bw:unlock')
      .then(() => {
        setIsUnlocking(false)
        refreshStatus()
      })
      .catch((err: Error) => {
        setIsUnlocking(false)
        setUnlockError(err.message || 'Kilit açma başarısız oldu. Pinentry kapatılmış olabilir.')
      })
  }

  const handleSync = (): void => {
    setIsSyncing(true)
    setUnlockError('')
    ipc('bw:sync')
      .then(() => {
        setIsSyncing(false)
        refreshStatus()
      })
      .catch((err: Error) => {
        setIsSyncing(false)
        setUnlockError(err.message || 'Eşitleme başarısız oldu.')
      })
  }

  // 1. Status Loading
  if (status === null) {
    return (
      <div style={{ padding: 'var(--space-5)', fontSize: 'var(--font-sm)', opacity: 0.85 }}>
        Kasa durumu kontrol ediliyor...
      </div>
    )
  }

  // 2. CLI not installed wizard
  if (status.installed === false || status.backend === 'none') {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {IconLock && <IconLock style={{ width: '20px', height: '20px' }} />}
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Bitwarden CLI Bulunamadı
          </h2>
        </div>
        <p style={{ opacity: 0.85, margin: 0 }}>
          Nuxy Bitwarden eklentisi, şifrelerinize güvenli bir şekilde erişmek için arka planda{' '}
          <code>rbw</code> (Rust tabanlı Bitwarden CLI istemcisi) aracını kullanır. Lütfen devam
          etmeden önce rbw'yi kurun.
        </p>

        {/* OS Tab Header */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--syntax-comment)',
            gap: '12px',
            paddingBottom: '8px',
            marginTop: '8px',
          }}
        >
          {Button && (
            <Button onClick={() => setActiveTab('arch')} variant={activeTab === 'arch' ? 'primary' : 'ghost'}>
              Arch Linux / CachyOS
              {status.os === 'arch' && Badge && <Badge active>Sisteminiz</Badge>}
            </Button>
          )}
          {Button && (
            <Button onClick={() => setActiveTab('debian')} variant={activeTab === 'debian' ? 'primary' : 'ghost'}>
              Ubuntu / Debian
              {status.os === 'debian' && Badge && <Badge active>Sisteminiz</Badge>}
            </Button>
          )}
          {Button && (
            <Button onClick={() => setActiveTab('macos')} variant={activeTab === 'macos' ? 'primary' : 'ghost'}>
              macOS
              {status.os === 'macos' && Badge && <Badge active>Sisteminiz</Badge>}
            </Button>
          )}
        </div>

        {/* Tab Contents */}
        {Card && (
          <Card style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {activeTab === 'arch' && (
              <>
                <strong>Arch Linux / CachyOS için Kurulum:</strong>
                <p style={{ margin: 0, opacity: 0.8 }}>
                  Depolarda bulunan <code>rbw</code> ve şifre sorması için <code>pinentry</code>{' '}
                  paketlerini kurun:
                </p>
                <pre
                  style={{
                    background: 'var(--surface-code, #000)',
                    padding: '12px',
                    borderRadius: '6px',
                    margin: 0,
                    color: 'var(--syntax-green)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <code>sudo pacman -S rbw pinentry</code>
                  <Button
                    onClick={() => ipc('bw:copyText', { text: 'sudo pacman -S rbw pinentry' }).catch(() => {})}
                  >
                    Kopyala
                  </Button>
                </pre>
              </>
            )}

            {activeTab === 'debian' && (
              <>
                <strong>Ubuntu / Debian için Kurulum:</strong>
                <p style={{ margin: 0, opacity: 0.8 }}>
                  <code>apt</code> kullanarak <code>rbw</code> paketini kurun:
                </p>
                <pre
                  style={{
                    background: 'var(--surface-code, #000)',
                    padding: '12px',
                    borderRadius: '6px',
                    margin: 0,
                    color: 'var(--syntax-green)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <code>sudo apt install rbw</code>
                  <Button onClick={() => ipc('bw:copyText', { text: 'sudo apt install rbw' }).catch(() => {})}>
                    Kopyala
                  </Button>
                </pre>
              </>
            )}

            {activeTab === 'macos' && (
              <>
                <strong>macOS için Kurulum:</strong>
                <p style={{ margin: 0, opacity: 0.8 }}>
                  <code>Homebrew</code> kullanarak <code>rbw</code> paketini kurun:
                </p>
                <pre
                  style={{
                    background: 'var(--surface-code, #000)',
                    padding: '12px',
                    borderRadius: '6px',
                    margin: 0,
                    color: 'var(--syntax-green)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <code>brew install rbw</code>
                  <Button onClick={() => ipc('bw:copyText', { text: 'brew install rbw' }).catch(() => {})}>
                    Kopyala
                  </Button>
                </pre>
              </>
            )}
          </Card>
        )}

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
          <Button onClick={refreshStatus}>Kurulumu Tamamladım, Yeniden Denetle</Button>
        </div>
      </div>
    )
  }

  // 3. Account Configure Screen (if email is not set or we are editing it)
  if (status.configured === false || editingEmail) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {IconUser && <IconUser style={{ width: '20px', height: '20px' }} />}
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Bitwarden Hesabınızı Bağlayın
          </h2>
        </div>
        <p style={{ opacity: 0.85, margin: 0 }}>
          Bitwarden hesabınıza ait e-posta adresini girin. Bu adres yerel bilgisayarınızdaki{' '}
          <code>rbw</code> konfigürasyon dosyasına kaydedilecektir.
        </p>

        {Card && (
          <Card style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: '600' }}>Bitwarden E-posta Adresi:</label>
              {Input && (
                <Input
                  type="email"
                  placeholder="ornek@alanadi.com"
                  value={emailInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEmailInput(e.target.value)
                  }
                  disabled={isConfiguring}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              )}
            </div>

            {errorMsg && Alert && <Alert variant="danger">{errorMsg}</Alert>}

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button onClick={handleSaveEmail} disabled={isConfiguring}>
                {isConfiguring ? 'Kaydediliyor...' : 'Kaydet ve Devam Et'}
              </Button>
              {editingEmail && (
                <Button onClick={() => setEditingEmail(false)} disabled={isConfiguring}>
                  İptal Et
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    )
  }

  // 4. Lock Screen
  if (status.locked === true) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {IconLock && <IconLock style={{ width: '20px', height: '20px' }} />}
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Bitwarden Kasanız Kilitli
          </h2>
        </div>
        <p style={{ opacity: 0.85, margin: 0 }}>
          Hesabınız: <strong style={{ color: 'var(--syntax-function)' }}>{status.email}</strong>
        </p>

        {Card && (
          <Card style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
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

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button onClick={handleUnlock} disabled={isUnlocking || isSyncing}>
                {isUnlocking ? 'Şifre Bekleniyor...' : 'Kilit Aç (Pinentry)'}
              </Button>
              <Button onClick={handleSync} disabled={isUnlocking || isSyncing}>
                {isSyncing ? 'Eşitleniyor...' : 'Kasa Eşitle (Sync)'}
              </Button>
              <Button onClick={refreshStatus} disabled={isUnlocking || isSyncing}>
                Durumu Yenile
              </Button>
              <Button
                onClick={() => {
                  setEmailInput(status.email || '')
                  setEditingEmail(true)
                }}
                disabled={isUnlocking || isSyncing}
              >
                E-postayı Düzenle
              </Button>
            </div>
          </Card>
        )}

        <div style={{ marginTop: '8px' }}>
          <p style={{ opacity: 0.7, margin: 0 }}>
            Alternatif olarak, terminaliniz üzerinden de kilidi açabilirsiniz:
          </p>
          <pre
            style={{
              background: 'var(--surface-code, #000)',
              padding: '12px',
              borderRadius: '6px',
              marginTop: '6px',
              color: 'var(--syntax-green)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <code>rbw unlock</code>
            <Button onClick={() => ipc('bw:copyText', { text: 'rbw unlock' }).catch(() => {})}>Kopyala</Button>
          </pre>
        </div>
      </div>
    )
  }

  // 5. Active Vault Search Screen (Normal Screen)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {List ? (
          <List>
            {results.length === 0 ? (
              <EmptyState
                message={query ? 'Sonuç bulunamadı.' : 'Aramak istediğiniz şifre adını yazın.'}
              />
            ) : (
              results.map((item, idx) => (
                <ListItem
                  key={item.id}
                  active={idx === selectedIndex}
                  onClick={() => setSelectedIndex(idx)}
                >
                  <ListItemBody>
                    <ListItemText>{item.name}</ListItemText>
                    <ListItemMeta>{item.username}</ListItemMeta>
                  </ListItemBody>
                  <ListItemActions>
                    <Button onClick={() => copyPassword(item)}>
                      {copiedId === `${item.id}-pw` ? 'Kopyalandı!' : 'Şifreyi Kopyala'}
                    </Button>
                    <Button onClick={() => copyUsername(item)}>
                      {copiedId === `${item.id}-un` ? 'Kopyalandı!' : 'Kullanıcı Adını Kopyala'}
                    </Button>
                    <Button onClick={() => copyTotp(item)}>
                      {copiedId === `${item.id}-otp` ? 'Kopyalandı!' : 'TOTP Kopyala'}
                    </Button>
                  </ListItemActions>
                </ListItem>
              ))
            )}
          </List>
        ) : null}
      </div>
    </div>
  )
}
