import type { MetaResult } from '../types.ts'

/** Coerce stored JSON into a clean MetaResult[] (defensive against malformed files). */
export function parseFavorites(raw: unknown): MetaResult[] {
  if (!Array.isArray(raw)) return []
  const out: MetaResult[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const m = item as Record<string, unknown>
    if (typeof m.id !== 'string' || typeof m.name !== 'string') continue
    if (m.type !== 'movie' && m.type !== 'series') continue
    out.push({
      id: m.id,
      type: m.type,
      name: m.name,
      year: typeof m.year === 'string' ? m.year : '',
      poster: typeof m.poster === 'string' ? m.poster : '',
    })
  }
  return out
}

export function isFavorited(list: MetaResult[], id: string): boolean {
  return list.some((m) => m.id === id)
}

/** Add the title if absent, remove it if present. Returns the new list and the resulting state. */
export function toggleFavorite(
  list: MetaResult[],
  meta: MetaResult
): { favorites: MetaResult[]; isFavorite: boolean } {
  if (isFavorited(list, meta.id)) {
    return { favorites: list.filter((m) => m.id !== meta.id), isFavorite: false }
  }
  return { favorites: [...list, meta], isFavorite: true }
}
