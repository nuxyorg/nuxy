import { describe, it, expect } from 'vitest'
import { searchEmojis, buildVisibleEmojis, buildAllCategories } from './emojiSearch.ts'
import type { EmojiCategory, EmojiEntry } from '../types.ts'

const CAT_SMILEYS: EmojiCategory = {
  id: 'smileys',
  label: 'Smileys',
  icon: '😀',
  emojis: [
    { e: '😀', n: 'grinning face', k: 'happy smile' },
    { e: '😂', n: 'face with tears of joy', k: 'laugh funny' },
  ],
}

const CAT_ANIMALS: EmojiCategory = {
  id: 'animals',
  label: 'Animals',
  icon: '🐶',
  emojis: [
    { e: '🐶', n: 'dog face', k: 'pet' },
    { e: '🐱', n: 'cat face', k: 'pet' },
  ],
}

describe('searchEmojis', () => {
  it('returns null for empty query', () => {
    expect(searchEmojis('', [CAT_SMILEYS])).toBeNull()
    expect(searchEmojis('   ', [CAT_SMILEYS])).toBeNull()
  })

  it('matches emoji by name', () => {
    const results = searchEmojis('grin', [CAT_SMILEYS, CAT_ANIMALS])
    expect(results).not.toBeNull()
    expect(results!.map((r) => r.e)).toContain('😀')
  })

  it('matches emoji by keyword', () => {
    const results = searchEmojis('pet', [CAT_SMILEYS, CAT_ANIMALS])
    expect(results!.map((r) => r.e)).toEqual(expect.arrayContaining(['🐶', '🐱']))
  })

  it('matches emoji by category label', () => {
    const results = searchEmojis('animals', [CAT_SMILEYS, CAT_ANIMALS])
    expect(results!.map((r) => r.e)).toEqual(expect.arrayContaining(['🐶', '🐱']))
  })

  it('does not return duplicates', () => {
    // "face" matches both smiley names; also dog face — no dups
    const results = searchEmojis('face', [CAT_SMILEYS, CAT_ANIMALS])!
    const emojis = results.map((r) => r.e)
    expect(new Set(emojis).size).toBe(emojis.length)
  })

  it('returns empty array when nothing matches', () => {
    const results = searchEmojis('zzznomatch', [CAT_SMILEYS, CAT_ANIMALS])
    expect(results).toEqual([])
  })
})

describe('buildVisibleEmojis', () => {
  it('flattens categories into a single list', () => {
    const { visibleEmojis } = buildVisibleEmojis([CAT_SMILEYS, CAT_ANIMALS])
    expect(visibleEmojis).toHaveLength(4)
  })

  it('records correct start indices for each category', () => {
    const { categoryIndices } = buildVisibleEmojis([CAT_SMILEYS, CAT_ANIMALS])
    expect(categoryIndices['smileys']).toBe(0)
    expect(categoryIndices['animals']).toBe(2)
  })

  it('skips empty categories', () => {
    const empty: EmojiCategory = { id: 'empty', label: 'Empty', icon: null, emojis: [] }
    const { visibleEmojis, categoryIndices } = buildVisibleEmojis([empty, CAT_ANIMALS])
    expect(visibleEmojis).toHaveLength(2)
    expect(categoryIndices['empty']).toBeUndefined()
    expect(categoryIndices['animals']).toBe(0)
  })
})

describe('buildAllCategories', () => {
  const map = new Map<string, EmojiEntry>([
    ['😀', CAT_SMILEYS.emojis[0]],
    ['😂', CAT_SMILEYS.emojis[1]],
  ])

  it('returns categories unchanged when no favorites', () => {
    const result = buildAllCategories([CAT_SMILEYS], map, [])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('smileys')
  })

  it('prepends a favorites category when favorites exist', () => {
    const result = buildAllCategories([CAT_SMILEYS], map, ['😀'])
    expect(result[0].id).toBe('favorites')
    expect(result[0].emojis[0].e).toBe('😀')
  })

  it('falls back gracefully for unknown favorite emojis', () => {
    const result = buildAllCategories([CAT_SMILEYS], map, ['🆕'])
    expect(result[0].id).toBe('favorites')
    expect(result[0].emojis[0].e).toBe('🆕')
    expect(result[0].emojis[0].n).toBe('🆕')
  })
})
