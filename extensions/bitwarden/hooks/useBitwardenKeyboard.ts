const React = window.React

import type { BitwardenStatus, BitwardenItem } from '../types.ts'

const TABS = ['arch', 'debian', 'macos'] as const
type Tab = (typeof TABS)[number]

interface Params {
  status: BitwardenStatus | null
  results: BitwardenItem[]
  selectedIndex: number
  activeTab: string
  setActiveTab: React.Dispatch<React.SetStateAction<string>>
  editingEmail: boolean
  isInstallScreen: boolean
  isConfigScreen: boolean
  isLockScreen: boolean
  isConfiguring: boolean
  isUnlocking: boolean
  isSyncing: boolean
  refreshStatus: () => void
  handleSaveEmail: () => void
  handleUnlock: () => void
  handleSync: () => void
  setEmailInput: React.Dispatch<React.SetStateAction<string>>
  setEditingEmail: React.Dispatch<React.SetStateAction<boolean>>
}

export function useBitwardenKeyboard({
  status,
  results,
  selectedIndex,
  activeTab,
  setActiveTab,
  editingEmail,
  isInstallScreen,
  isConfigScreen,
  isLockScreen,
  isConfiguring,
  isUnlocking,
  isSyncing,
  refreshStatus,
  handleSaveEmail,
  handleUnlock,
  handleSync,
  setEmailInput,
  setEditingEmail,
}: Params): void {
  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  _useToolKeyActions([
    {
      key: 'ArrowLeft',
      label: 'Önceki Sekme',
      hint: '←→',
      activeOn: () => isInstallScreen,
      handler: () => {
        const idx = TABS.indexOf(activeTab as Tab)
        if (idx > 0) setActiveTab(TABS[idx - 1])
      },
    },
    {
      key: 'ArrowRight',
      label: '',
      activeOn: () => isInstallScreen,
      handler: () => {
        const idx = TABS.indexOf(activeTab as Tab)
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

  React.useEffect(() => {
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
            setEmailInput(status?.email || '')
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
}
