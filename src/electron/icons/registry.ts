import type { IconPackDefinition } from '@nuxy/core'

const packs = new Map<string, IconPackDefinition>()
let defaultPackName: string | undefined

export function registerIconPack(def: IconPackDefinition, isDefault = false): void {
  packs.set(def.name, def)
  if (isDefault || !defaultPackName) defaultPackName = def.name
}

export function getIcon(name: string, packName?: string): string | null {
  const pack = packName
    ? packs.get(packName)
    : defaultPackName
      ? packs.get(defaultPackName)
      : undefined
  if (!pack) return null
  if (Array.isArray(pack.icons)) return null
  return (pack.icons as Record<string, string>)[name] ?? null
}

export function getIconPack(packName?: string): IconPackDefinition | null {
  const name = packName ?? defaultPackName
  return (name ? packs.get(name) : undefined) ?? null
}

export function listIconPacks(): string[] {
  return [...packs.keys()]
}

export function getDefaultPackName(): string | undefined {
  return defaultPackName
}

export function clearIconRegistry(): void {
  packs.clear()
  defaultPackName = undefined
}
