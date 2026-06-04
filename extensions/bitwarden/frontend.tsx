const React = window.React

const EXT_ID = 'com.nuxy.bitwarden'
const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

import type { BitwardenItem } from './types.ts'
import type { UseListNavigationOptions, UseListNavigationResult } from '@nuxy/ui'

import { useBitwardenData } from './hooks/useBitwardenData.ts'
import { useBitwardenActions } from './hooks/useBitwardenActions.ts'
import { useBitwardenKeyboard } from './hooks/useBitwardenKeyboard.ts'
import { useBitwardenSync } from './hooks/useBitwardenSync.ts'
import { getScreenState } from './utils/screenState.ts'

import { BitwardenInstallScreen } from './components/BitwardenInstallScreen.tsx'
import { BitwardenConfigScreen } from './components/BitwardenConfigScreen.tsx'
import { BitwardenLockScreen } from './components/BitwardenLockScreen.tsx'
import { BitwardenVaultList } from './components/BitwardenVaultList.tsx'

type UseListNavigationFn = <T>(
  items: T[],
  options?: UseListNavigationOptions<T>
) => UseListNavigationResult<T>

const _useListNavigation: UseListNavigationFn =
  (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))

interface Props {
  query: string
}

export default function BitwardenView({ query }: Props) {
  const { t } = _useTranslation(EXT_ID)
  const [activeTab, setActiveTab] = React.useState<string>('arch')
  const [editingEmail, setEditingEmail] = React.useState<boolean>(false)

  const { status, results, refreshStatus, emailInput, setEmailInput } = useBitwardenData(query)

  const { isInstallScreen, isConfigScreen, isLockScreen } = getScreenState(status, editingEmail)

  const {
    isConfiguring,
    isUnlocking,
    isSyncing,
    errorMsg,
    unlockError,
    copyPassword,
    copyUsername,
    copyTotp,
    handleSaveEmail,
    handleUnlock,
    handleSync,
  } = useBitwardenActions({ refreshStatus, emailInput, setEmailInput, setEditingEmail })

  const { selectedIndex, setSelectedIndex } = _useListNavigation(results, {
    onEnter: (item: BitwardenItem) => copyPassword(item),
    enterLabel: t('actions.copyPassword'),
    enterHint: 'Enter',
    extraActions: [
      {
        key: 'Enter',
        modifiers: ['shift'],
        label: t('actions.copyUsername'),
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
        label: t('actions.copyTotp'),
        hint: ['Ctrl', 'Enter'],
        activeOn: () => (selectedIndex as number) >= 0,
        handler: () => {
          const item = results[selectedIndex as number]
          if (item) copyTotp(item)
        },
      },
    ],
  }) as UseListNavigationResult<BitwardenItem>

  useBitwardenKeyboard({
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
    t,
  })

  useBitwardenSync({
    status,
    selectedIndex,
    results,
    editingEmail,
    isConfiguring,
    isUnlocking,
    isSyncing,
    activeTab,
    isLockScreen,
    setSelectedIndex,
    setActiveTab,
  })

  if (status === null) {
    return (
      <div style={{ padding: 'var(--space-5)', fontSize: 'var(--font-sm)', opacity: 0.85 }}>
        {t('status.checking')}
      </div>
    )
  }

  if (isInstallScreen) {
    return (
      <BitwardenInstallScreen status={status} activeTab={activeTab} onTabChange={setActiveTab} />
    )
  }

  if (isConfigScreen) {
    return (
      <BitwardenConfigScreen
        emailInput={emailInput}
        isConfiguring={isConfiguring}
        errorMsg={errorMsg}
        onEmailChange={setEmailInput}
      />
    )
  }

  if (isLockScreen) {
    return (
      <BitwardenLockScreen
        status={status}
        isUnlocking={isUnlocking}
        isSyncing={isSyncing}
        unlockError={unlockError}
      />
    )
  }

  return <BitwardenVaultList results={results} query={query} selectedIndex={selectedIndex} />
}
