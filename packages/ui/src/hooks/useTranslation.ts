// fallow-ignore-file code-duplication

type Vars = Record<string, string | number>

export interface UseTranslationResult {
  t: (key: string, vars?: Vars, count?: number) => string
  locale: string
  dir: 'ltr' | 'rtl'
}

export function useTranslation(extId: string): UseTranslationResult {
  const fn = (window.UI as { useTranslation?: (id: string) => UseTranslationResult })?.useTranslation
  if (fn) return fn(extId)
  return { t: (key) => key, locale: 'en', dir: 'ltr' }
}
