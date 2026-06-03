const React = window.React

import type { BitwardenItem } from '../types.ts'

const EXT_ID = 'com.nuxy.bitwarden'

async function ipc(channel: string, payload?: unknown): Promise<unknown> {
  const res = (await window.core.ipc.invoke(EXT_ID, channel, payload)) as {
    success?: boolean
    data?: unknown
    error?: string
  } | null
  if (res && res.success) return res.data
  throw new Error(res?.error || 'IPC call failed')
}

interface Params {
  refreshStatus: () => void
  emailInput: string
  setEmailInput: React.Dispatch<React.SetStateAction<string>>
  setEditingEmail: React.Dispatch<React.SetStateAction<boolean>>
}

interface Actions {
  copiedId: string | null
  isConfiguring: boolean
  isUnlocking: boolean
  isSyncing: boolean
  errorMsg: string
  unlockError: string
  copyPassword: (item: BitwardenItem) => void
  copyUsername: (item: BitwardenItem) => void
  copyTotp: (item: BitwardenItem) => void
  handleSaveEmail: () => void
  handleUnlock: () => void
  handleSync: () => void
}

export function useBitwardenActions({ refreshStatus, emailInput, setEmailInput, setEditingEmail }: Params): Actions {
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [isConfiguring, setIsConfiguring] = React.useState<boolean>(false)
  const [isUnlocking, setIsUnlocking] = React.useState<boolean>(false)
  const [isSyncing, setIsSyncing] = React.useState<boolean>(false)
  const [errorMsg, setErrorMsg] = React.useState<string>('')
  const [unlockError, setUnlockError] = React.useState<string>('')

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

  return {
    copiedId,
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
  }
}
