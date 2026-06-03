const React = window.React

import type { ExtensionListItem } from '../types.ts'

const EXT_ID = 'com.nuxy.store'

interface StoreData {
  extensions: ExtensionListItem[]
  loading: boolean
  error: string | null
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setExtensions: React.Dispatch<React.SetStateAction<ExtensionListItem[]>>
  loadCatalog: () => Promise<void>
}

export function useStoreData(): StoreData {
  const [extensions, setExtensions] = React.useState<ExtensionListItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadCatalog = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.core.ipc.invoke(EXT_ID, 'getExtensions', {})
      const r = res as { success: boolean; data?: ExtensionListItem[]; error?: string }
      if (r?.success && Array.isArray(r.data)) {
        setExtensions(r.data)
      } else {
        setError(r?.error || 'Failed to fetch catalog')
      }
    } catch (e: any) {
      setError(e.message || 'Network error fetching extensions')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  return { extensions, loading, error, setLoading, setError, setExtensions, loadCatalog }
}
