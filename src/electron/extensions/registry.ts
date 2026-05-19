import type { ExtensionRuntimeMeta, LoadedExtension } from '@nuxy/core'

const byId = new Map<string, LoadedExtension>()
const folderToId = new Map<string, string>()
const ipcChannelsByExtId = new Map<string, Set<string>>()

export const loadedExtensions: LoadedExtension[] = []

export function registerExtension(ext: LoadedExtension): void {
  byId.set(ext.id, ext)
  folderToId.set(ext.folderName, ext.id)
  loadedExtensions.push(ext)
}

export function getExtensionById(id: string): LoadedExtension | undefined {
  return byId.get(id)
}

export function getExtensionFolder(id: string): string | undefined {
  return byId.get(id)?.folderName
}

export function resolveExtensionId(idOrFolder: string): string | undefined {
  if (byId.has(idOrFolder)) return idOrFolder
  return folderToId.get(idOrFolder)
}

export function isBootstrapExtension(ext: LoadedExtension): boolean {
  return ext.manifest.bootstrap === true
}

export function getBootstrapExtension(): LoadedExtension | undefined {
  return loadedExtensions.find(isBootstrapExtension)
}

export function setExtensionChannels(extId: string, channels: string[]): void {
  ipcChannelsByExtId.set(extId, new Set(channels))
}

export function isChannelAllowed(extId: string, channel: string): boolean {
  const allowed = ipcChannelsByExtId.get(extId)
  if (!allowed) return false
  return allowed.has(channel)
}

export function mergeRuntimeSync(
  extId: string,
  payload: ExtensionRuntimeMeta
): void {
  const ext = byId.get(extId)
  if (!ext) return
  ext.runtime = payload
  setExtensionChannels(extId, payload.ipcChannels)
}

export function getDisplayName(ext: LoadedExtension): string {
  return ext.runtime?.displayName ?? ext.manifest.name
}

export function clearRegistry(): void {
  byId.clear()
  folderToId.clear()
  ipcChannelsByExtId.clear()
  loadedExtensions.length = 0
}
