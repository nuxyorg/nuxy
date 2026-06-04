export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'
export type TextDirection = 'ltr' | 'rtl'

const RTL_BASES = new Set([
  'ar',
  'arc',
  'dv',
  'fa',
  'ha',
  'he',
  'ks',
  'ku',
  'ps',
  'sd',
  'ug',
  'ur',
  'yi',
])

export function getTextDirection(locale: string): TextDirection {
  const base = locale.split('-')[0].toLowerCase()
  return RTL_BASES.has(base) ? 'rtl' : 'ltr'
}

/**
 * Resolve the best matching locale from the user's ordered preference list.
 * Matching precedence per candidate:
 *   1. Exact match              ("tr-TR" === "tr-TR")
 *   2. Language-base match      ("tr-TR" → "tr")
 *   3. Region-variant match     ("tr"    → "tr-TR")
 */
export function resolveLocale(
  preferred: string[],
  supported: string[],
  defaultLocale: string
): string {
  const norm = supported.map((l) => l.toLowerCase())

  for (const lang of preferred) {
    if (!lang) continue
    const lower = lang.toLowerCase()

    const exact = norm.indexOf(lower)
    if (exact !== -1) return supported[exact]

    const base = lower.split('-')[0]
    const baseIdx = norm.indexOf(base)
    if (baseIdx !== -1) return supported[baseIdx]

    const variantIdx = norm.findIndex((s) => s.split('-')[0] === base)
    if (variantIdx !== -1) return supported[variantIdx]
  }

  return defaultLocale || supported[0] || 'en'
}

const PLURAL_KEYS = new Set(['zero', 'one', 'two', 'few', 'many', 'other'])

/**
 * Flatten a nested translation object into dot-notation keys.
 * Plural objects { one: "...", other: "..." } become "key__one", "key__other".
 * The top-level "meta" key is skipped (reserved for locale metadata).
 */
export function flattenTranslations(obj: unknown, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  if (typeof obj !== 'object' || obj === null) return result

  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (prefix === '' && k === 'meta') continue
    const full = prefix ? `${prefix}.${k}` : k

    if (typeof v === 'string') {
      result[full] = v
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      const keys = Object.keys(v as object)
      const isPlural = keys.length > 0 && keys.every((pk) => PLURAL_KEYS.has(pk))
      if (isPlural) {
        for (const [pk, pv] of Object.entries(v as Record<string, unknown>)) {
          if (typeof pv === 'string') result[`${full}__${pk}`] = pv
        }
      } else {
        Object.assign(result, flattenTranslations(v, full))
      }
    }
  }

  return result
}

/** Replace `{variable}` placeholders with values from `vars`. */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  )
}

/** Pick the plural-form translation for `count` in `locale`. */
export function selectPlural(
  translations: Record<string, string>,
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
