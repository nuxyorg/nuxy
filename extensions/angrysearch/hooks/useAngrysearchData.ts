const React = window.React

import type { AngrysearchItem, DbStatus } from '../types.ts'

const EXT_ID = 'com.nuxy.angrysearch'

interface AngrysearchData {
  items: AngrysearchItem[]
  status: DbStatus | null
  setStatus: React.Dispatch<React.SetStateAction<DbStatus | null>>
}

export function useAngrysearchData(searchQuery: string, regexMode: boolean): AngrysearchData {
  const [items, setItems] = React.useState<AngrysearchItem[]>([])
  const [status, setStatus] = React.useState<DbStatus | null>(null)

  React.useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'getStatus')
      .then((res) => {
        const r = res as { success?: boolean; data?: DbStatus } | null
        if (r?.success) setStatus(r.data ?? null)
      })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    if (searchQuery.trim().length < 3) {
      setItems([])
      return
    }

    const timer = setTimeout(() => {
      window.core.ipc
        .invoke(EXT_ID, 'search', { query: searchQuery, regex: regexMode })
        .then((res) => {
          const r = res as { success?: boolean; data?: { items: AngrysearchItem[] } } | null
          if (r?.success) {
            setItems(r.data?.items || [])
          }
        })
        .catch(() => {})
    }, 150)

    return () => clearTimeout(timer)
  }, [searchQuery, regexMode])

  return { items, status, setStatus }
}
