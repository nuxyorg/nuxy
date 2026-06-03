const React = window.React

import type { SshHost } from '../types.ts'

const EXT_ID = 'com.nuxy.ssh'

interface SshData {
  hosts: SshHost[]
  loading: boolean
  refresh: () => void
}

export function useSshData(): SshData {
  const [hosts, setHosts] = React.useState<SshHost[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)

  function loadHosts(): void {
    if (!window.core?.ipc?.invoke) return
    setLoading(true)
    window.core.ipc
      .invoke(EXT_ID, 'ssh:list', undefined)
      .then((res) => {
        const r = res as { success: boolean; data?: SshHost[] } | null
        if (r?.success && Array.isArray(r.data)) {
          setHosts(r.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  function refresh(): void {
    if (!window.core?.ipc?.invoke) return
    setLoading(true)
    window.core.ipc
      .invoke(EXT_ID, 'ssh:refresh', undefined)
      .then((res) => {
        const r = res as { success: boolean; data?: SshHost[] } | null
        if (r?.success && Array.isArray(r.data)) {
          setHosts(r.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  React.useEffect(() => {
    loadHosts()
  }, [])

  return { hosts, loading, refresh }
}
