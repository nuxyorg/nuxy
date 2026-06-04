import type { LoadedExtension, RegistryEntry } from '@nuxy/core'
import { getDisplayName, isBootstrapExtension } from '../extensions/registry.js'
import { loadedExtensions } from '../extensions/scanner.js'

export type ListableKind = RegistryEntry['kind']

export function extensionMatchesListKind(ext: LoadedExtension, kind: ListableKind): boolean {
  const entries = ext.runtime?.registeredEntries
  if (entries && entries.length > 0) {
    return entries.some((e) => e.kind === kind)
  }
  return ext.manifest.type === kind
}

export function listExtensionsByKind(kind: ListableKind): LoadedExtension[] {
  return loadedExtensions
    .filter((ext) => {
      if (ext.disabled) return false
      if (isBootstrapExtension(ext)) return false
      return extensionMatchesListKind(ext, kind)
    })
    .map((ext) => ({
      ...ext,
      manifest: { ...ext.manifest, name: getDisplayName(ext) },
    }))
}
