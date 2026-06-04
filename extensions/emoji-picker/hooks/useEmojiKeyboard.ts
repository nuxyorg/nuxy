const React = window.React

import type { EmojiCategory, EmojiEntry } from '../types.ts'

const COLS = 9

interface Handlers {
  copyEmoji: (emoji: string) => void
  toggleFavorite: (emoji: string) => void
}

interface NavRef {
  setFocusArea: (area: 'left' | 'right') => void
}

interface Params {
  visibleEmojis: EmojiEntry[]
  allCategories: EmojiCategory[]
  selectedIdx: number
  setSelectedIdx: (idx: number) => void
  searchResults: EmojiEntry[] | null
  navRef: React.MutableRefObject<NavRef | null>
  handlers: Handlers
  t: (key: string) => string
}

export function buildRightPanelActions({
  visibleEmojis,
  allCategories,
  selectedIdx,
  setSelectedIdx,
  searchResults,
  navRef,
  handlers,
  t,
}: Params) {
  const { copyEmoji, toggleFavorite } = handlers

  const moveFocusRight = (delta: number) => {
    const len = visibleEmojis.length
    if (len === 0) return

    if (delta === -1 && !searchResults) {
      let isLeftEdge = false
      let localIdx = selectedIdx
      for (const cat of allCategories) {
        if (cat.emojis.length > 0) {
          if (localIdx < cat.emojis.length) {
            isLeftEdge = localIdx % COLS === 0
            break
          }
          localIdx -= cat.emojis.length
        }
      }
      if (isLeftEdge) {
        navRef.current?.setFocusArea('left')
        return
      }
    }

    setSelectedIdx(Math.max(0, Math.min(selectedIdx + delta, len - 1)))
  }

  const moveFocusUpDown = (direction: number) => {
    const len = visibleEmojis.length
    if (len === 0) return

    if (searchResults) {
      const row = Math.floor(selectedIdx / COLS)
      const col = selectedIdx % COLS
      const nextIdx = (row + direction) * COLS + col
      if (nextIdx >= 0 && nextIdx < len) {
        setSelectedIdx(nextIdx)
      } else if (direction === 1 && nextIdx >= len) {
        const lastRow = Math.floor((len - 1) / COLS)
        if (row < lastRow) setSelectedIdx(len - 1)
      }
      return
    }

    let currentCat: EmojiCategory | null = null
    let sectionStart = 0
    let localIdx = selectedIdx
    for (const cat of allCategories) {
      if (cat.emojis.length > 0) {
        if (localIdx < cat.emojis.length) {
          currentCat = cat
          break
        }
        localIdx -= cat.emojis.length
        sectionStart += cat.emojis.length
      }
    }
    if (!currentCat) return

    const catLen = currentCat.emojis.length
    const row = Math.floor(localIdx / COLS)
    const col = localIdx % COLS

    if (direction === -1) {
      if (row > 0) {
        setSelectedIdx(sectionStart + (row - 1) * COLS + col)
      } else {
        let prevCat: EmojiCategory | null = null
        let prevSectionStart = 0
        const currentCatIdx = allCategories.findIndex((c) => c.id === currentCat!.id)
        for (let i = currentCatIdx - 1; i >= 0; i--) {
          const cat = allCategories[i]
          if (cat.emojis.length > 0) {
            prevCat = cat
            prevSectionStart = 0
            for (let j = 0; j < i; j++) {
              if (allCategories[j].emojis.length > 0)
                prevSectionStart += allCategories[j].emojis.length
            }
            break
          }
        }
        if (prevCat) {
          const prevLastRow = Math.floor((prevCat.emojis.length - 1) / COLS)
          setSelectedIdx(
            prevSectionStart + Math.min(prevCat.emojis.length - 1, prevLastRow * COLS + col)
          )
        }
      }
    } else {
      const nextRowStart = (row + 1) * COLS
      if (nextRowStart < catLen) {
        setSelectedIdx(sectionStart + Math.min(catLen - 1, nextRowStart + col))
      } else {
        let nextCat: EmojiCategory | null = null
        let nextSectionStart = sectionStart + catLen
        const currentCatIdx = allCategories.findIndex((c) => c.id === currentCat!.id)
        for (let i = currentCatIdx + 1; i < allCategories.length; i++) {
          const cat = allCategories[i]
          if (cat.emojis.length > 0) {
            nextCat = cat
            break
          }
          nextSectionStart += cat.emojis.length
        }
        if (nextCat) {
          setSelectedIdx(nextSectionStart + Math.min(nextCat.emojis.length - 1, col))
        }
      }
    }
  }

  return [
    { key: 'ArrowLeft', label: t('actions.moveLeft'), handler: () => moveFocusRight(-1) },
    { key: 'ArrowRight', label: t('actions.moveRight'), handler: () => moveFocusRight(1) },
    { key: 'ArrowUp', label: t('actions.moveUp'), hint: '↑↓', handler: () => moveFocusUpDown(-1) },
    { key: 'ArrowDown', label: t('actions.moveDown'), handler: () => moveFocusUpDown(1) },
    {
      key: 'Enter',
      label: t('actions.copyEmoji'),
      hint: '↵',
      handler: () => {
        const em = visibleEmojis[selectedIdx]
        if (em) copyEmoji(em.e)
      },
    },
    {
      key: 'f',
      modifiers: ['ctrl'],
      label: t('actions.toggleFavorite'),
      handler: () => {
        const em = visibleEmojis[selectedIdx]
        if (em) toggleFavorite(em.e)
      },
    },
  ]
}
