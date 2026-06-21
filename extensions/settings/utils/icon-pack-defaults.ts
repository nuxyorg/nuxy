import type { NuxySettings, SelectOption } from '../types.ts'

export function buildIconPackOptions(packNames: string[]): SelectOption[] {
  if (packNames.length <= 1) {
    return packNames.map((name) => ({ value: name, label: name }))
  }
  return [{ value: '', label: '' }, ...packNames.map((name) => ({ value: name, label: name }))]
}

/** When only one pack is installed, always use it instead of an empty default. */
export function resolveSingleIconPack(
  settings: NuxySettings,
  packNames: string[]
): NuxySettings | null {
  if (packNames.length !== 1) return null
  const only = packNames[0]
  if (settings.iconPack === only) return null
  return { ...settings, iconPack: only }
}
