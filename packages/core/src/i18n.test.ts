import { describe, it, expect } from 'vitest'
import {
  getTextDirection,
  resolveLocale,
  flattenTranslations,
  mergeTranslations,
  interpolate,
  selectPlural,
} from './i18n.ts'

describe('getTextDirection', () => {
  it('returns rtl for arabic and hebrew bases', () => {
    expect(getTextDirection('ar')).toBe('rtl')
    expect(getTextDirection('he-IL')).toBe('rtl')
  })

  it('returns ltr for non-rtl locales', () => {
    expect(getTextDirection('en')).toBe('ltr')
    expect(getTextDirection('tr-TR')).toBe('ltr')
  })

  it('is case-insensitive on the base language', () => {
    expect(getTextDirection('FA-IR')).toBe('rtl')
  })
})

describe('resolveLocale', () => {
  const supported = ['en', 'tr-TR', 'fr']

  it('matches an exact locale', () => {
    expect(resolveLocale(['tr-TR'], supported, 'en')).toBe('tr-TR')
  })

  it('falls back to the language base when exact match is missing', () => {
    expect(resolveLocale(['tr-CY'], supported, 'en')).toBe('tr-TR')
  })

  it('matches a region variant when only the base is preferred', () => {
    expect(resolveLocale(['tr'], ['tr-TR'], 'en')).toBe('tr-TR')
  })

  it('skips empty preferences and tries the next candidate', () => {
    expect(resolveLocale(['', 'fr'], supported, 'en')).toBe('fr')
  })

  it('returns defaultLocale when nothing matches', () => {
    expect(resolveLocale(['de'], supported, 'en')).toBe('en')
  })

  it('falls back to the first supported locale when defaultLocale is empty', () => {
    expect(resolveLocale(['de'], supported, '')).toBe('en')
  })

  it('falls back to "en" when nothing is supplied at all', () => {
    expect(resolveLocale([], [], '')).toBe('en')
  })
})

describe('flattenTranslations', () => {
  it('flattens nested objects into dot-notation keys', () => {
    expect(flattenTranslations({ a: { b: 'hello' } })).toEqual({ 'a.b': 'hello' })
  })

  it('skips the top-level meta key', () => {
    expect(flattenTranslations({ meta: { dir: 'ltr' }, greeting: 'hi' })).toEqual({
      greeting: 'hi',
    })
  })

  it('expands plural objects into __category suffixed keys', () => {
    expect(flattenTranslations({ items: { one: '1 item', other: '{n} items' } })).toEqual({
      items__one: '1 item',
      items__other: '{n} items',
    })
  })

  it('returns an empty object for non-object input', () => {
    expect(flattenTranslations('not an object')).toEqual({})
    expect(flattenTranslations(null)).toEqual({})
  })

  it('ignores non-string, non-object values', () => {
    expect(flattenTranslations({ count: 5 })).toEqual({})
  })
})

describe('mergeTranslations', () => {
  it('uses overrides when present and falls back to base for missing keys', () => {
    expect(
      mergeTranslations(
        { 'actions.closeSetting': 'Close setting', 'actions.reorderPriority': 'Reorder' },
        { 'actions.closeSetting': 'Ayarı kapat' }
      )
    ).toEqual({
      'actions.closeSetting': 'Ayarı kapat',
      'actions.reorderPriority': 'Reorder',
    })
  })
})

describe('interpolate', () => {
  it('replaces {variable} placeholders with provided values', () => {
    expect(interpolate('Hello {name}!', { name: 'World' })).toBe('Hello World!')
  })

  it('leaves unmatched placeholders untouched', () => {
    expect(interpolate('Hello {name}!', {})).toBe('Hello {name}!')
  })

  it('stringifies numeric values', () => {
    expect(interpolate('{count} items', { count: 3 })).toBe('3 items')
  })
})

describe('selectPlural', () => {
  it('selects the matching plural category for the locale', () => {
    const translations = { items__one: '1 item', items__other: '{n} items' }
    expect(selectPlural(translations, 'items', 1, 'en')).toBe('1 item')
    expect(selectPlural(translations, 'items', 5, 'en')).toBe('{n} items')
  })

  it('falls back to the "other" category when the exact category key is missing', () => {
    const translations = { items__other: '{n} items' }
    expect(selectPlural(translations, 'items', 1, 'en')).toBe('{n} items')
  })

  it('falls back gracefully for an invalid locale', () => {
    const translations = { items__one: '1 item', items__other: '{n} items' }
    expect(selectPlural(translations, 'items', 1, 'not-a-real-locale')).toBe('1 item')
  })
})
