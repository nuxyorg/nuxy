const React = window.React

import type { SshHost } from '../types.ts'

const EXT_ID = 'com.nuxy.ssh'

interface Params {
  refresh: () => void
}

interface SshActions {
  connecting: boolean
  handleConnect: (host: SshHost) => void
  handleRefresh: () => void
}

export function useSshActions({ refresh }: Params): SshActions {
  const [connecting, setConnecting] = React.useState<boolean>(false)

  const handleConnect = React.useCallback((host: SshHost): void => {
    if (!window.core?.ipc?.invoke) return
    setConnecting(true)
    window.core.ipc
      .invoke(EXT_ID, 'ssh:connect', { host: host.name })
      .then(() => {
        window.core?.window?.hide?.()
      })
      .catch(() => {})
      .finally(() => setConnecting(false))
  }, [])

  const handleRefresh = React.useCallback((): void => {
    refresh()
  }, [refresh])

  return { connecting, handleConnect, handleRefresh }
}
