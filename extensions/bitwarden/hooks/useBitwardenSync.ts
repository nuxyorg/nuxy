const React = window.React

import type { BitwardenStatus } from '../types.ts'

interface Params {
  status: BitwardenStatus | null
  selectedIndex: number
  results: unknown[]
  editingEmail: boolean
  isConfiguring: boolean
  isUnlocking: boolean
  isSyncing: boolean
  activeTab: string
  isLockScreen: boolean
  setSelectedIndex: (index: number) => void
  setActiveTab: (tab: string) => void
}

export function useBitwardenSync({
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
}: Params): void {
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex, results])

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [status, editingEmail, isConfiguring, isUnlocking, isSyncing, activeTab, isLockScreen])

  React.useEffect(() => {
    setSelectedIndex(-1)
  }, [results, setSelectedIndex])

  React.useEffect(() => {
    if (status?.os) {
      if (status.os === 'arch' || status.os === 'debian' || status.os === 'macos') {
        setActiveTab(status.os)
      } else {
        setActiveTab('arch')
      }
    }
  }, [status?.os])
}
