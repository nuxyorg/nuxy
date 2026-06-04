import type { BitwardenStatus } from '../types.ts'

export interface ScreenState {
  isInstallScreen: boolean
  isConfigScreen: boolean
  isLockScreen: boolean
  isVaultScreen: boolean
}

export function getScreenState(status: BitwardenStatus | null, editingEmail: boolean): ScreenState {
  if (status === null) {
    return {
      isInstallScreen: false,
      isConfigScreen: false,
      isLockScreen: false,
      isVaultScreen: false,
    }
  }
  const isInstallScreen = status.installed === false || status.backend === 'none'
  const isConfigScreen = !isInstallScreen && (status.configured === false || editingEmail)
  const isLockScreen = !isInstallScreen && !isConfigScreen && status.locked === true
  const isVaultScreen = !isInstallScreen && !isConfigScreen && !isLockScreen
  return { isInstallScreen, isConfigScreen, isLockScreen, isVaultScreen }
}
