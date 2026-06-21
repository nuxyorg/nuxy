import type { ExtensionType, IpcChannelMap } from '@nuxyorg/extension-sdk'

export interface StoreExtension {
  id: string
  name: string
  description: string
  version: string
  type: ExtensionType
  author: string
  downloadUrl: string
  permissions?: string[]
  icon?: string
}

export interface RegistryIndex {
  version: number
  extensions: StoreExtension[]
}

export interface ExtensionListItem extends StoreExtension {
  installed: boolean
  installedVersion?: string
  canUpdate: boolean
  isSystem: boolean
}

export interface InstallExtensionPayload {
  extId: string
  downloadUrl: string
}

export interface UninstallExtensionPayload {
  extId: string
}

export interface ActionResult {
  success: boolean
  error?: string
}

export interface IpcChannels extends IpcChannelMap {
  getExtensions: { input: void; output: ExtensionListItem[] }
  installExtension: { input: InstallExtensionPayload; output: ActionResult }
  uninstallExtension: { input: UninstallExtensionPayload; output: ActionResult }
}
