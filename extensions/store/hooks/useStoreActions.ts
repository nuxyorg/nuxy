import type { ExtensionListItem } from '../types.ts'

const EXT_ID = 'com.nuxy.store'

interface Params {
  loading: boolean
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  loadCatalog: () => Promise<void>
  t: (key: string, vars?: Record<string, string | number>) => string
}

interface StoreActions {
  handleInstall: (ext: ExtensionListItem) => Promise<void>
  handleUninstall: (ext: ExtensionListItem) => Promise<void>
}

export function useStoreActions({
  loading,
  setLoading,
  setError,
  loadCatalog,
  t,
}: Params): StoreActions {
  const { toast } = window.UI || {}

  const handleInstall = async (ext: ExtensionListItem): Promise<void> => {
    if (loading) return
    setLoading(true)
    if (toast) toast(t('loading.installing', { name: ext.name }), { type: 'info' })
    try {
      const res = await window.core.ipc.invoke(EXT_ID, 'installExtension', {
        extId: ext.id,
        downloadUrl: ext.downloadUrl,
      })
      const r = res as { success: boolean; error?: string }
      if (r?.success) {
        if (toast) toast(t('toast.installSuccess', { name: ext.name }), { type: 'success' })
        void loadCatalog()
      } else {
        setError(r.error || t('error.installFailed', { name: ext.name }))
        if (toast) toast(r.error || t('toast.installFailed'), { type: 'error' })
      }
    } catch (e: any) {
      setError(e.message || t('error.installError'))
      if (toast) toast(e.message || t('toast.installFailed'), { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleUninstall = async (ext: ExtensionListItem): Promise<void> => {
    if (loading || ext.isSystem) return
    setLoading(true)
    if (toast) toast(t('loading.uninstalling', { name: ext.name }), { type: 'info' })
    try {
      const res = await window.core.ipc.invoke(EXT_ID, 'uninstallExtension', {
        extId: ext.id,
      })
      const r = res as { success: boolean; error?: string }
      if (r?.success) {
        if (toast) toast(t('toast.uninstallSuccess', { name: ext.name }), { type: 'success' })
        void loadCatalog()
      } else {
        setError(r.error || t('error.uninstallFailed', { name: ext.name }))
        if (toast) toast(r.error || t('toast.uninstallFailed'), { type: 'error' })
      }
    } catch (e: any) {
      setError(e.message || t('error.uninstallError'))
      if (toast) toast(e.message || t('toast.uninstallFailed'), { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return { handleInstall, handleUninstall }
}
