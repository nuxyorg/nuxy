import type { CoreContext, LoadedExtension } from '@nuxy/extension-sdk'
import type { StoreExtension, RegistryIndex, ExtensionListItem } from './types.ts'

const DEFAULT_REGISTRY_URL =
  'https://raw.githubusercontent.com/atagulalan/nuxy-assets/main/registry.json'

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'store', displayName: 'Store' })

  // Fetches remote registry JSON and installed extensions, then merges them
  core.ipc.handle('getExtensions', async (): Promise<ExtensionListItem[]> => {
    try {
      const registryUrl = (await core.settings.read<string>('registryUrl')) ?? DEFAULT_REGISTRY_URL

      // 1. Fetch remote registry
      let remoteExtensions: StoreExtension[] = []
      try {
        const response = await fetch(registryUrl)
        if (response.ok) {
          const index = (await response.json()) as RegistryIndex
          remoteExtensions = index.extensions || []
        }
      } catch (err) {
        core.logger.error('Failed to fetch store registry index:', err)
      }

      // 2. Fetch installed extensions from kernel
      let installedExtensions: LoadedExtension[] = []
      const kernelRes = await core.extensions.invoke('kernel', 'listInstalledExtensions')
      if (kernelRes.success && Array.isArray(kernelRes.data)) {
        installedExtensions = kernelRes.data as LoadedExtension[]
      }

      // 3. Map installed extensions for lookup
      const installedMap = new Map<string, LoadedExtension>()
      for (const ext of installedExtensions) {
        installedMap.set(ext.id, ext)
      }

      const mergedList: ExtensionListItem[] = []

      // 4. Process all extensions from remote catalog
      for (const remote of remoteExtensions) {
        const installed = installedMap.get(remote.id)
        const installedVersion = installed?.manifest.version
        const isSystem =
          remote.id === 'com.nuxy.shell' ||
          remote.id === 'com.nuxy.settings' ||
          !!installed?.manifest.bootstrap

        mergedList.push({
          ...remote,
          installed: !!installed,
          installedVersion,
          canUpdate: !!installed && installedVersion !== remote.version,
          isSystem,
        })
        installedMap.delete(remote.id)
      }

      // 5. Append any locally installed extensions that aren't in the remote catalog
      for (const [, local] of installedMap) {
        const isSystem =
          local.id === 'com.nuxy.shell' ||
          local.id === 'com.nuxy.settings' ||
          !!local.manifest.bootstrap

        mergedList.push({
          id: local.id,
          name: local.manifest.name,
          description: `Locally installed extension.`,
          version: local.manifest.version,
          type: local.manifest.type,
          author: 'Local',
          downloadUrl: '',
          permissions: local.manifest.permissions,
          icon: local.manifest.icon,
          installed: true,
          installedVersion: local.manifest.version,
          canUpdate: false,
          isSystem,
        })
      }

      return mergedList
    } catch (e: any) {
      core.logger.error('Error merging store extensions:', e)
      return []
    }
  })

  // Proxy install call to kernel
  core.ipc.handle(
    'installExtension',
    async (payload: unknown): Promise<{ success: boolean; error?: string }> => {
      const { extId, downloadUrl } = payload as { extId: string; downloadUrl: string }
      const result = await core.extensions.invoke('kernel', 'installExtension', {
        extId,
        downloadUrl,
      })
      return {
        success: result.success,
        error: result.error,
      }
    }
  )

  // Proxy uninstall call to kernel
  core.ipc.handle(
    'uninstallExtension',
    async (payload: unknown): Promise<{ success: boolean; error?: string }> => {
      const { extId } = payload as { extId: string }
      const result = await core.extensions.invoke('kernel', 'uninstallExtension', { extId })
      return {
        success: result.success,
        error: result.error,
      }
    }
  )
}
