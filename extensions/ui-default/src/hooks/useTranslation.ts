import { useState, useEffect, useCallback } from 'react'

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

interface TranslationState {
  translations: Translations
  locale: string
  dir: 'ltr' | 'rtl'
  loaded: boolean
}

export interface UseTranslationResult {
  t: (key: string, vars?: Vars, count?: number) => string
  locale: string
  dir: 'ltr' | 'rtl'
}

export function useTranslation(extId: string): UseTranslationResult {
  const [state, setState] = useState<TranslationState>({
    translations: {},
    locale: 'en',
    dir: 'ltr',
    loaded: false,
  })

  const fetchTranslations = useCallback(async () => {
    try {
      const res = (await window.core?.ipc?.invoke('kernel', 'getExtensionTranslations', {
        extId,
      })) as
        | {
            success: boolean
            data?: { locale: string; dir: 'ltr' | 'rtl'; translations: Translations }
          }
        | undefined
      if (res?.success && res.data) setState({ ...res.data, loaded: true })
    } catch {}
  }, [extId])

  useEffect(() => {
    void fetchTranslations()
    const handler = () => void fetchTranslations()
    window.addEventListener('nuxy-locale-changed', handler)
    return () => window.removeEventListener('nuxy-locale-changed', handler)
  }, [fetchTranslations])

  const t = useCallback(
    (key: string, vars?: Vars, count?: number): string => {
      if (!state.loaded) return ''
      let template: string | undefined
      if (count !== undefined) {
        template = selectPlural(state.translations, key, count, state.locale)
      }
      if (!template) template = state.translations[key]
      if (!template) return key
      return vars ? interpolate(template, vars) : template
    },
    [state]
  )

  return { t, locale: state.locale, dir: state.dir }
}
