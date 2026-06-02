const React = window.React
const { useState, useEffect, useRef, useCallback } = React

import type { BitwardenStatus, BitwardenItem } from './types.ts'
import type { UseListNavigationOptions, UseListNavigationResult } from '@nuxy/ui'

const EXT_ID = 'com.nuxy.bitwarden'

type UseListNavigationFn = <T>(
  items: T[],
  options?: UseListNavigationOptions<T>
) => UseListNavigationResult<T>

const _useListNavigation: UseListNavigationFn =
  (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))

const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

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
    EmptyState,
    Card,
    Input,
    Badge,
    Alert,
    IconLock,
    IconUser,
    CodeBlock,
  } = window.UI || {}
  const WizardSection = (window.UI as any)?.WizardSection

  const [status, setStatus] = useState<BitwardenStatus | null>(null)
  const [results, setResults] = useState<BitwardenItem[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { selectedIndex, setSelectedIndex } = (_useListNavigation(results, {
    onEnter: (item: BitwardenItem) => copyPassword(item),
    enterLabel: 'Şifreyi Kopyala',
    enterHint: 'Enter',
    extraActions: [
      {
        key: 'Enter',
        modifiers: ['shift'],
        label: 'Kullanıcı Adını Kopyala',
        hint: ['⇧', 'Enter'],
        activeOn: () => (selectedIndex as number) >= 0,
        handler: () => {
          const item = results[selectedIndex as number]
          if (item) copyUsername(item)
        },
      },
      {
        key: 'Enter',
        modifiers: ['ctrl'],
        label: 'TOTP Kopyala',
        hint: ['Ctrl', 'Enter'],
        activeOn: () => (selectedIndex as number) >= 0,
        handler: () => {
          const item = results[selectedIndex as number]
          if (item) copyTotp(item)
        },
      },
    ],
  }) as UseListNavigationResult<BitwardenItem>)

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
      .catch(() => {})
  }

  const copyUsername = (item: BitwardenItem): void => {
    ipc('bw:copyUsername', item)
      .then(() => flash(`${item.id}-un`))
      .catch(() => {})
  }

  const copyTotp = (item: BitwardenItem): void => {
    ipc('bw:getTotp', item)
      .then((res) => ipc('bw:copyTotp', { code: (res as { code: string }).code }))
      .then(() => flash(`${item.id}-otp`))
      .catch(() => {})
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

  const TABS = ['arch', 'debian', 'macos'] as const
  const isInstallScreen = status !== null && (status.installed === false || status.backend === 'none')
  const isConfigScreen = status !== null && !isInstallScreen && (status.configured === false || editingEmail)
  const isLockScreen = status !== null && !isInstallScreen && !isConfigScreen && status.locked === true

  _useToolKeyActions([
    {
      key: 'ArrowLeft',
      label: 'Önceki Sekme',
      hint: '←→',
      activeOn: () => isInstallScreen,
      handler: () => {
        const idx = TABS.indexOf(activeTab as (typeof TABS)[number])
        if (idx > 0) setActiveTab(TABS[idx - 1])
      },
    },
    {
      key: 'ArrowRight',
      label: '',
      activeOn: () => isInstallScreen,
      handler: () => {
        const idx = TABS.indexOf(activeTab as (typeof TABS)[number])
        if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1])
      },
    },
    {
      key: 'Enter',
      label: 'Yeniden Denetle',
      hint: '↵',
      activeOn: () => isInstallScreen,
      handler: refreshStatus,
    },
    {
      key: 'Enter',
      label: 'Kaydet',
      hint: '↵',
      activeOn: () => isConfigScreen && !isConfiguring,
      handler: handleSaveEmail,
    },
    {
      key: 'Escape',
      label: 'İptal',
      hint: 'Esc',
      activeOn: () => isConfigScreen && editingEmail,
      handler: () => setEditingEmail(false),
    },
    {
      key: 'Enter',
      label: 'Kilit Aç',
      hint: '↵',
      activeOn: () => isLockScreen && !isUnlocking && !isSyncing,
      handler: handleUnlock,
    },
  ])

  useEffect(() => {
    const actions = []
    if (isLockScreen && !isUnlocking && !isSyncing) {
      actions.push(
        {
          id: 'bw-sync',
          label: 'Kasa Eşitle',
          onExecute: handleSync,
        },
        {
          id: 'bw-refresh',
          label: 'Durumu Yenile',
          onExecute: refreshStatus,
        },
        {
          id: 'bw-edit-email',
          label: 'E-postayı Düzenle',
          onExecute: () => {
            setEmailInput(status.email || '')
            setEditingEmail(true)
          },
        }
      )
    }
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    }
  }, [isLockScreen, isUnlocking, isSyncing, status])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [status, editingEmail, isConfiguring, isUnlocking, isSyncing, activeTab, isLockScreen])

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
        {WizardSection ? (
          <WizardSection
            icon={IconLock && <IconLock />}
            title="Bitwarden CLI Bulunamadı"
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {IconLock && <IconLock style={{ width: 'var(--icon-md)', height: 'var(--icon-md)' }} />}
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

        {/* OS Tab Header — ←→ ile gezilebilir */}
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
              }}
            >
              {tab === 'arch' ? 'Arch Linux / CachyOS' : tab === 'debian' ? 'Ubuntu / Debian' : 'macOS'}
              {status.os === tab && Badge && <Badge active>Sisteminiz</Badge>}
            </div>
          ))}
        </div>

        {/* Tab Contents */}
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
                {CodeBlock && (
                  <CodeBlock code="sudo pacman -S rbw pinentry" language="sh" />
                )}
              </>
            )}

            {activeTab === 'debian' && (
              <>
                <strong>Ubuntu / Debian için Kurulum:</strong>
                <p style={{ margin: 0, opacity: 0.8 }}>
                  <code>apt</code> kullanarak <code>rbw</code> paketini kurun:
                </p>
                {CodeBlock && (
                  <CodeBlock code="sudo apt install rbw" language="sh" />
                )}
              </>
            )}

            {activeTab === 'macos' && (
              <>
                <strong>macOS için Kurulum:</strong>
                <p style={{ margin: 0, opacity: 0.8 }}>
                  <code>Homebrew</code> kullanarak <code>rbw</code> paketini kurun:
                </p>
                {CodeBlock && (
                  <CodeBlock code="brew install rbw" language="sh" />
                )}
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
        {WizardSection ? (
          <WizardSection
            icon={IconUser && <IconUser />}
            title="Bitwarden Hesabınızı Bağlayın"
          />
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEmailInput(e.target.value)
                  }
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
        {WizardSection ? (
          <WizardSection
            icon={IconLock && <IconLock />}
            title="Bitwarden Kasanız Kilitli"
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {IconLock && <IconLock style={{ width: 'var(--icon-md)', height: 'var(--icon-md)' }} />}
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
              {isUnlocking ? 'Şifre bekleniyor...' : isSyncing ? 'Eşitleniyor...' : '↵ Kilit Aç · ⌃S Eşitle · ⌃R Yenile'}
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
                >
                  <ListItemBody>
                    <ListItemText>{item.name}</ListItemText>
                    <ListItemMeta>{item.username}</ListItemMeta>
                  </ListItemBody>
                </ListItem>
              ))
            )}
          </List>
        ) : null}
      </div>
    </div>
  )
}
