import type { EmojiCategory, EmojiEntry } from '../types.ts'

/**
 * Returns matching emoji entries for the given search query across all categories.
 * Returns null when the query is empty (no search active).
 */
export function searchEmojis(query: string, emojiCategories: EmojiCategory[]): EmojiEntry[] | null {
  const q = (query || '').toLowerCase().trim()
  if (!q) return null

  const results: EmojiEntry[] = []
  const seen = new Set<string>()

  for (const cat of emojiCategories) {
    const catMatch = cat.label.toLowerCase().includes(q) || cat.id.includes(q)
    for (const em of cat.emojis) {
      if (seen.has(em.e)) continue
      if (catMatch || em.n.toLowerCase().includes(q) || em.k.includes(q)) {
        results.push(em)
        seen.add(em.e)
      }
    }
  }

  return results
}

/**
 * Builds the flat visible emoji list and per-category start indices
 * for the browsing (non-search) view.
 */
export function buildVisibleEmojis(allCategories: EmojiCategory[]): {
  visibleEmojis: EmojiEntry[]
  categoryIndices: Record<string, number>
} {
  const flat: EmojiEntry[] = []
  const indices: Record<string, number> = {}

  for (const cat of allCategories) {
    if (cat.emojis.length > 0) {
      indices[cat.id] = flat.length
      flat.push(...cat.emojis)
    }
  }

  return { visibleEmojis: flat, categoryIndices: indices }
}

/**
 * Builds the full category list, prepending a Favorites pseudo-category
 * when the user has any favorites.
 */
export function buildAllCategories(
  emojiCategories: EmojiCategory[],
  emojiMap: Map<string, EmojiEntry>,
  favorites: string[]
): EmojiCategory[] {
  const favEmojis = favorites
    .map((e) => emojiMap.get(e) || { e, n: e, k: '' })
    .filter(Boolean) as EmojiEntry[]

  const cats = [...emojiCategories]
  if (favEmojis.length > 0) {
    cats.unshift({ id: 'favorites', label: 'Favorites', icon: null, emojis: favEmojis })
  }
  return cats
}
