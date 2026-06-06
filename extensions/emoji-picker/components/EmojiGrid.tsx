const React = window.React

import type { EmojiCategory, EmojiEntry } from '../types.ts'

const COLS = 9

interface Props {
  visibleEmojis: EmojiEntry[]
  allCategories: EmojiCategory[]
  searchResults: EmojiEntry[] | null
  selectedIdx: number
  focusArea: 'left' | 'right'
  categoryRefs: React.MutableRefObject<Record<number, HTMLElement | null>>
  sectionRefs: React.MutableRefObject<Record<string, HTMLElement | null>>
  catId: string | null
  onCopyEmoji: (emoji: string) => void
  onToggleFavorite: (emoji: string) => void
  isFav: (emoji: string) => boolean
  onScroll: () => void
  rightPanelRef: React.MutableRefObject<HTMLDivElement | null>
  t: (key: string, vars?: Record<string, string | number>, count?: number) => string
}

export function EmojiGrid({
  visibleEmojis,
  allCategories,
  searchResults,
  selectedIdx,
  focusArea,
  categoryRefs,
  sectionRefs,
  catId,
  onCopyEmoji,
  onToggleFavorite,
  isFav,
  onScroll,
  rightPanelRef,
  t,
}: Props) {
  const { Grid, GridItem, SectionHeader } = window.UI || {}

  const renderEmoji = (em: EmojiEntry, idx: number) => {
    const fav = isFav(em.e)
    const { Icon } = window.UI || {}
    return (
      <GridItem
        key={em.e + idx}
        ref={(el: HTMLElement | null) => (categoryRefs.current[idx] = el)}
        active={focusArea === 'right' && idx === selectedIdx}
        title={`${em.n}${fav ? t('tooltip.favorite') : ''}`}
        onClick={() => onCopyEmoji(em.e)}
        onContextMenu={(e: React.MouseEvent) => {
          e.preventDefault()
          onToggleFavorite(em.e)
        }}
      >
        {em.e}
        {fav && Icon && (
          <Icon
            name="Star"
            style={{
              position: 'absolute',
              top: 'var(--space-0)',
              right: 'var(--space-0)',
              width: 'var(--icon-xs)',
              height: 'var(--icon-xs)',
              color: 'var(--syntax-constant)',
            }}
          />
        )}
      </GridItem>
    )
  }

  return (
    <div
      ref={rightPanelRef}
      className="nuxy-emoji-picker__right-panel"
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-2) var(--space-3)' }}
      onScroll={onScroll}
    >
      {searchResults && (
        <div
          style={{
            padding: 'var(--space-1) var(--space-3) var(--space-2)',
            fontSize: 'var(--font-xs)',
            opacity: 0.45,
            flexShrink: 0,
            letterSpacing: '0.01em',
          }}
        >
          {t('search.resultsCount', { count: searchResults.length }, searchResults.length)}
        </div>
      )}

      {visibleEmojis.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            opacity: 0.38,
            fontSize: 'var(--font-sm)',
            textAlign: 'center',
            padding: '0 var(--space-5)',
          }}
        >
          {catId === 'favorites' && !searchResults ? t('empty.noFavorites') : t('empty.noResults')}
        </div>
      ) : Grid ? (
        searchResults ? (
          <Grid cols={COLS} gap={2}>
            {visibleEmojis.map((em: EmojiEntry, idx: number) => renderEmoji(em, idx))}
          </Grid>
        ) : (
          <div>
            {(() => {
              let globalIdx = 0
              return allCategories.map((cat: EmojiCategory) => {
                if (cat.emojis.length === 0) return null
                const sectionStart = globalIdx
                globalIdx += cat.emojis.length
                return (
                  <div
                    key={cat.id}
                    ref={(el: HTMLDivElement | null) => (sectionRefs.current[cat.id] = el)}
                    style={{ marginBottom: 'var(--space-3)' }}
                  >
                    {SectionHeader ? (
                      <SectionHeader label={cat.label} />
                    ) : (
                      <div
                        style={{
                          padding: 'var(--space-1) var(--space-4)',
                          fontSize: 'var(--font-sm)',
                          opacity: 0.5,
                          fontWeight: 500,
                        }}
                      >
                        {cat.label}
                      </div>
                    )}
                    <Grid cols={COLS} gap={2}>
                      {cat.emojis.map((em: EmojiEntry, i: number) =>
                        renderEmoji(em, sectionStart + i)
                      )}
                    </Grid>
                  </div>
                )
              })
            })()}
          </div>
        )
      ) : null}
    </div>
  )
}
