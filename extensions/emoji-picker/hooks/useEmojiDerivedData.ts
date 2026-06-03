const React = window.React

import type { EmojiCategory, EmojiEntry } from '../types.ts'
import { searchEmojis, buildVisibleEmojis, buildAllCategories } from '../utils/emojiSearch.ts'

interface Params {
  emojiCategories: EmojiCategory[] | null
  emojiMap: Map<string, EmojiEntry> | null
  favorites: string[]
  query: string
}

interface NavSection {
  id: string
  label: string
  icon: string | null
  itemCount: number
}

interface EmojiDerivedData {
  allCategories: EmojiCategory[]
  searchResults: EmojiEntry[] | null
  visibleEmojis: EmojiEntry[]
  categoryIndices: Record<string, number>
  navSections: NavSection[]
}

export function useEmojiDerivedData({ emojiCategories, emojiMap, favorites, query }: Params): EmojiDerivedData {
  const allCategories = React.useMemo<EmojiCategory[]>(() => {
    if (!emojiCategories || !emojiMap) return []
    return buildAllCategories(emojiCategories, emojiMap, favorites)
  }, [favorites, emojiCategories, emojiMap])

  const searchResults = React.useMemo(
    () => (emojiCategories ? searchEmojis(query, emojiCategories) : null),
    [query, emojiCategories]
  )

  const { visibleEmojis, categoryIndices } = React.useMemo(
    () =>
      searchResults
        ? { visibleEmojis: searchResults, categoryIndices: {} }
        : buildVisibleEmojis(allCategories),
    [searchResults, allCategories]
  )

  const navSections = React.useMemo(
    () =>
      allCategories
        .filter((cat) => cat.emojis.length > 0)
        .map((cat) => ({ id: cat.id, label: cat.label, icon: cat.icon, itemCount: cat.emojis.length })),
    [allCategories]
  )

  return { allCategories, searchResults, visibleEmojis, categoryIndices, navSections }
}
