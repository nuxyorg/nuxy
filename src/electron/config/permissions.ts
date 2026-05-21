import type { ExtensionManifest, ExtensionPermission, IpcResult } from '@nuxy/core'
import { HostChannel } from '@nuxy/core'

const HOST_CHANNEL_PERMISSION: Partial<Record<string, ExtensionPermission>> = {
  [HostChannel.CLIPBOARD_READ]: 'clipboard',
  [HostChannel.CLIPBOARD_WRITE]: 'clipboard',
  [HostChannel.CLIPBOARD_WRITE_FILES]: 'clipboard',
  [HostChannel.FS_FILE_EXISTS]: 'clipboard',
  [HostChannel.STORAGE_READ]: 'storage',
  [HostChannel.STORAGE_WRITE]: 'storage',
  [HostChannel.MEDIA_GET_NOW_PLAYING]: 'media',
}

/** Default when manifest omits permissions (backward compatible). */
export function effectivePermissions(manifest: ExtensionManifest): ExtensionPermission[] {
  if (manifest.permissions && manifest.permissions.length > 0) {
    return manifest.permissions
  }
  return ['storage']
}

export function assertHostPermission(
  manifest: ExtensionManifest,
  channel: string
): IpcResult | null {
  const required = HOST_CHANNEL_PERMISSION[channel]
  if (!required) return null

  const granted = effectivePermissions(manifest)
  if (!granted.includes(required)) {
    return {
      success: false,
      error: `Permission denied: ${required}`,
      code: 'PERMISSION_DENIED',
    }
  }
  return null
}
