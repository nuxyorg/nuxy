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

export type TranslateFn = (key: string, vars?: Vars, count?: number) => string

export interface Translator {
  t: TranslateFn
  locale: string
  dir: 'ltr' | 'rtl'
  destroy: () => void
}

export function createTranslator(extId: string, onChange?: () => void): Translator {
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
        onChange?.()
      }
    } catch {
      /* ignore */
    }
  }

  void fetchTranslations()
  const off = window.core?.events?.on('locale-changed', () => void fetchTranslations())

  const t: TranslateFn = (key, vars, count) => {
    if (!loaded) return key
    let template: string | undefined
    if (count !== undefined) {
      template = selectPlural(translations, key, count, locale)
    }
    if (!template) template = translations[key]
    if (!template) return key
    return vars ? interpolate(template, vars) : template
  }

  return {
    t,
    get locale() {
      return locale
    },
    get dir() {
      return dir
    },
    destroy() {
      off?.()
    },
  }
}
