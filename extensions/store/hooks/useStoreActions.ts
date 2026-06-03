import type { ExtensionListItem } from '../types.ts'

const EXT_ID = 'com.nuxy.store'

interface Params {
  loading: boolean
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  loadCatalog: () => Promise<void>
}

interface StoreActions {
  handleInstall: (ext: ExtensionListItem) => Promise<void>
  handleUninstall: (ext: ExtensionListItem) => Promise<void>
}

export function useStoreActions({ loading, setLoading, setError, loadCatalog }: Params): StoreActions {
  const { toast } = window.UI || {}

  const handleInstall = async (ext: ExtensionListItem): Promise<void> => {
    if (loading) return
    setLoading(true)
    if (toast) toast(`Installing ${ext.name}...`, { type: 'info' })
    try {
      const res = await window.core.ipc.invoke(EXT_ID, 'installExtension', {
        extId: ext.id,
        downloadUrl: ext.downloadUrl,
      })
      const r = res as { success: boolean; error?: string }
      if (r?.success) {
        if (toast) toast(`${ext.name} installed successfully!`, { type: 'success' })
        void loadCatalog()
      } else {
        setError(r.error || `Failed to install ${ext.name}`)
        if (toast) toast(r.error || `Installation failed`, { type: 'error' })
      }
    } catch (e: any) {
      setError(e.message || 'Installation error')
      if (toast) toast(e.message || `Installation error`, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleUninstall = async (ext: ExtensionListItem): Promise<void> => {
    if (loading || ext.isSystem) return
    setLoading(true)
    if (toast) toast(`Uninstalling ${ext.name}...`, { type: 'info' })
    try {
      const res = await window.core.ipc.invoke(EXT_ID, 'uninstallExtension', {
        extId: ext.id,
      })
      const r = res as { success: boolean; error?: string }
      if (r?.success) {
        if (toast) toast(`${ext.name} uninstalled.`, { type: 'success' })
        void loadCatalog()
      } else {
        setError(r.error || `Failed to uninstall ${ext.name}`)
        if (toast) toast(r.error || `Uninstall failed`, { type: 'error' })
      }
    } catch (e: any) {
      setError(e.message || 'Uninstall error')
      if (toast) toast(e.message || `Uninstall error`, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return { handleInstall, handleUninstall }
}
