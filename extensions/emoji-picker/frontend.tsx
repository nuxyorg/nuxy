const React = window.React

const EXT_ID = 'com.nuxy.emoji-picker'
const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

import { useEmojiData } from './hooks/useEmojiData.ts'
import { useEmojiActions } from './hooks/useEmojiActions.ts'
import { useEmojiDerivedData } from './hooks/useEmojiDerivedData.ts'
import { useEmojiSync } from './hooks/useEmojiSync.ts'
import { useEmojiScrollSync } from './hooks/useEmojiScrollSync.ts'
import { buildRightPanelActions } from './hooks/useEmojiKeyboard.ts'
import { EmojiGrid } from './components/EmojiGrid.tsx'
import { EmojiLeftPanel } from './components/EmojiLeftPanel.tsx'

interface Props {
  query: string
  extensionId: string
}

interface TwoPanelNav {
  focusArea: 'left' | 'right'
  activeSectionId: string | null
  setFocusArea: (area: 'left' | 'right') => void
  setActiveSection: (id: string) => void
  goToSection: (id: string) => void
  onItemSelected: (idx: number) => void
}

const _useTwoPanelNav =
  (window.UI as { useTwoPanelNav?: (opts: any) => TwoPanelNav } | undefined)?.useTwoPanelNav ?? null

export default function EmojiPicker({ query, extensionId }: Props) {
  const { TwoPanel } = window.UI || {}
  const { t } = _useTranslation(EXT_ID)

  const { emojiCategories, emojiMap, favorites, setFavorites } = useEmojiData(extensionId)
  const { copyEmoji, toggleFavorite } = useEmojiActions({ setFavorites })
  const { allCategories, searchResults, visibleEmojis, categoryIndices, navSections } =
    useEmojiDerivedData({
      emojiCategories,
      emojiMap,
      favorites,
      query,
      favoritesLabel: t('categories.favorites'),
    })

  const [selectedIdx, setSelectedIdx] = React.useState<number>(0)
  const navRef = React.useRef<TwoPanelNav | null>(null)

  const nav = _useTwoPanelNav
    ? _useTwoPanelNav({
        sections: navSections,
        initialFocusArea: 'left',
        onSectionChange: (id: string) => {
          scrollSync.startProgrammaticScroll()
          const el = scrollSync.sectionRefs.current[id]
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        },
        onFocusRight: (id: string) => setSelectedIdx(categoryIndices[id] ?? 0),
        rightPanelActions: buildRightPanelActions({
          visibleEmojis,
          allCategories,
          selectedIdx,
          setSelectedIdx,
          searchResults,
          navRef,
          handlers: { copyEmoji, toggleFavorite },
          t,
        }),
      })
    : null

  navRef.current = nav

  const focusArea = nav?.focusArea ?? 'left'
  const catId = nav?.activeSectionId || allCategories[0]?.id || null

  const scrollSync = useEmojiScrollSync({
    navRef,
    navSections,
    selectedIdx,
    setSelectedIdx,
    focusArea,
    searchResults,
    allCategories,
    query,
  })

  useEmojiSync(selectedIdx, focusArea)

  if (!emojiCategories) return null

  const grid = (
    <EmojiGrid
      visibleEmojis={visibleEmojis}
      allCategories={allCategories}
      searchResults={searchResults}
      selectedIdx={selectedIdx}
      focusArea={focusArea}
      categoryRefs={scrollSync.categoryRefs}
      sectionRefs={scrollSync.sectionRefs}
      catId={catId}
      onCopyEmoji={copyEmoji}
      onToggleFavorite={toggleFavorite}
      isFav={(emoji) => favorites.includes(emoji)}
      onScroll={scrollSync.handleScroll}
      rightPanelRef={scrollSync.rightPanelRef}
      t={t}
    />
  )

  if (searchResults) return grid

  return (
    <TwoPanel
      split="auto"
      style={{ flex: 1, minHeight: 0 }}
      left={
        <EmojiLeftPanel
          allCategories={allCategories}
          catId={catId}
          onCategorySelect={(id) => {
            nav?.goToSection(id)
            nav?.setFocusArea('left')
          }}
        />
      }
      right={grid}
    />
  )
}
