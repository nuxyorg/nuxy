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

/** English defaults — shown until IPC translations load or when a key is missing. */
const SHELL_FALLBACKS: Record<string, string> = {
  'omniBar.placeholder': 'What do you have in mind?',
  'omniBar.searchTool': 'Search {toolName}',
  'omniBar.ariaLabel': 'Search',
  'results.ariaLabel': 'Results',
  'footer.extensionsLoaded': '{count} extensions loaded',
  'footer.pressToRun': 'Press',
  'footer.toRun': 'to run',
  'footer.toActions': 'to actions',
  loading: 'Loading…',
  'commandPalette.searchPlaceholder': 'Search commands...',
  'commandPalette.noActions': 'No actions available.',
  'commandPalette.enterShortcut': 'Enter',
}

function resolveTemplate(
  translations: Translations,
  key: string,
  count: number | undefined,
  locale: string
): string | undefined {
  if (count !== undefined) {
    const plural = selectPlural(translations, key, count, locale)
    if (plural) return plural
  }
  return translations[key] ?? SHELL_FALLBACKS[key]
}

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
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let retryCount = 0

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
        retryCount = 0
        onChange?.()
      } else if (!loaded && retryCount < 8) {
        retryCount++
        retryTimer = setTimeout(() => void fetchTranslations(), retryCount * 250)
      }
    } catch {
      /* ignore */
    }
  }

  void fetchTranslations()
  const off = window.core?.events?.on('locale-changed', () => {
    retryCount = 0
    void fetchTranslations()
  })

  const t: TranslateFn = (key, vars, count) => {
    const template = loaded
      ? resolveTemplate(translations, key, count, locale)
      : SHELL_FALLBACKS[key]
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
      if (retryTimer !== null) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
    },
  }
}
