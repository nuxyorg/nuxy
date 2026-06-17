import { flattenTranslations, getTextDirection, resolveLocale } from '@nuxyorg/core'

export interface DevLocaleConfig {
  default: string
  supported: string[]
  dir?: string
}

export interface DevLocaleExtension {
  id: string
  locales: DevLocaleConfig
}

export interface DevTranslationBundle {
  locale: string
  dir: 'ltr' | 'rtl'
  translations: Record<string, string>
}

const registry = new Map<string, DevLocaleExtension>()

export function registerDevLocaleExtensions(extensions: DevLocaleExtension[]): void {
  registry.clear()
  for (const ext of extensions) {
    registry.set(ext.id, ext)
  }
}

async function readLocaleFile(
  extId: string,
  locale: string
): Promise<Record<string, string> | null> {
  try {
    const res = await fetch(
      `/dev/locales/file?extId=${encodeURIComponent(extId)}&locale=${encodeURIComponent(locale)}`
    )
    if (!res.ok) return null
    const raw = await res.json()
    return flattenTranslations(raw)
  } catch {
    return null
  }
}

async function getPreferredLanguages(): Promise<string[]> {
  try {
    const res = await fetch('/api/invoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extId: 'com.nuxy.settings',
        channel: 'getSettings',
        payload: {},
      }),
    })
    if (!res.ok) return []
    const json = (await res.json()) as { data?: { preferredLanguages?: string[] } }
    return json.data?.preferredLanguages ?? []
  } catch {
    return []
  }
}

export async function loadDevExtensionTranslations(
  extId: string | undefined
): Promise<DevTranslationBundle | null> {
  if (!extId) return null

  const ext = registry.get(extId)
  if (!ext) return null

  const { default: defaultLocale, supported } = ext.locales
  const preferred = await getPreferredLanguages()
  const candidates = [...preferred, navigator.language].filter(Boolean)
  const resolved = resolveLocale(candidates, supported, defaultLocale)
  const dir = getTextDirection(resolved)

  const translations =
    (await readLocaleFile(extId, resolved)) ?? (await readLocaleFile(extId, defaultLocale)) ?? {}

  return { locale: resolved, dir, translations }
}
