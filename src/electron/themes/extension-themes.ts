import type { ThemeDefinition } from '@nuxyorg/core'

const byName = new Map<string, ThemeDefinition>()
let defaultThemeName: string | undefined

export function registerExtensionTheme(def: ThemeDefinition, isDefault = false): void {
  byName.set(def.name, def)
  if (isDefault || !defaultThemeName) defaultThemeName = def.name
}

export function getExtensionTheme(name: string): ThemeDefinition | undefined {
  return byName.get(name)
}

export function getDefaultTheme(): ThemeDefinition | undefined {
  return defaultThemeName ? byName.get(defaultThemeName) : undefined
}

export function getDefaultThemeName(): string | undefined {
  return defaultThemeName
}

export function listExtensionThemeNames(): string[] {
  return [...byName.keys()]
}

export function clearExtensionThemes(): void {
  byName.clear()
  defaultThemeName = undefined
}
