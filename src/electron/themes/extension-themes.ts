import type { ThemeDefinition } from '@nuxyorg/core'

const byName = new Map<string, ThemeDefinition>()

export function registerExtensionTheme(def: ThemeDefinition): void {
  byName.set(def.name, def)
}

export function getExtensionTheme(name: string): ThemeDefinition | undefined {
  return byName.get(name)
}

export function listExtensionThemeNames(): string[] {
  return [...byName.keys()]
}

export function clearExtensionThemes(): void {
  byName.clear()
}
