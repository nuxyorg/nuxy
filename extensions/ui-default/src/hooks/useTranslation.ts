// fallow-ignore-file code-duplication
type Translations = Record<string, string>
type Vars = Record<string, string | number>

function interpolate(template: string, vars: Vars): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  )
}

function selectPlural(
  translations: Translations,
  key: string,
  count: number,
  locale: string
): string | undefined {
  let cat: Intl.LDMLPluralRule = 'other'
  try {
    cat = new Intl.PluralRules(locale).select(count)
  } catch {
    cat = count === 1 ? 'one' : 'other'
  }
  return translations[`${key}__${cat}`] ?? translations[`${key}__other`]
}

export interface UseTranslationResult {
  t: (key: string, vars?: Vars, count?: number) => string
  locale: string
  dir: 'ltr' | 'rtl'
}

const cache = new Map<string, UseTranslationResult & { reload: () => void }>()

export function useTranslation(extId: string): UseTranslationResult {
  let entry = cache.get(extId)
  if (entry) return entry

  let translations: Translations = {}
  let locale = 'en'
  let dir: 'ltr' | 'rtl' = 'ltr'
  let loaded = false

  const fetchTranslations = async (): Promise<void> => {
    try {
      const res = (await window.core?.ipc?.invoke('kernel', 'getExtensionTranslations', {
        extId,
      })) as
        | {
            success: boolean
            data?: { locale: string; dir: 'ltr' | 'rtl'; translations: Translations }
          }
        | undefined
      if (res?.success && res.data) {
        translations = res.data.translations
        locale = res.data.locale
        dir = res.data.dir
        loaded = true
      }
    } catch {
      /* ignore */
    }
  }

  void fetchTranslations()
  window.core?.events?.on('locale-changed', () => void fetchTranslations())

  entry = {
    t(key, vars, count) {
      if (!loaded) return ''
      let template: string | undefined
      if (count !== undefined) {
        template = selectPlural(translations, key, count, locale)
      }
      if (!template) template = translations[key]
      if (!template) return key
      return vars ? interpolate(template, vars) : template
    },
    get locale() {
      return locale
    },
    get dir() {
      return dir
    },
    reload: () => void fetchTranslations(),
  }
  cache.set(extId, entry)
  return entry
}
