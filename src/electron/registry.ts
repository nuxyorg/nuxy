import type { LoadedExtension } from '@nuxy/core'

const byId = new Map<string, LoadedExtension>()
const folderToId = new Map<string, string>()

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

export function clearRegistry(): void {
  byId.clear()
  folderToId.clear()
  loadedExtensions.length = 0
}
