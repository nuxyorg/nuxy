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
}

export function buildRightPanelActions({
  visibleEmojis,
  allCategories,
  selectedIdx,
  setSelectedIdx,
  searchResults,
  navRef,
  handlers,
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
              if (allCategories[j].emojis.length > 0) prevSectionStart += allCategories[j].emojis.length
            }
            break
          }
        }
        if (prevCat) {
          const prevLastRow = Math.floor((prevCat.emojis.length - 1) / COLS)
          setSelectedIdx(prevSectionStart + Math.min(prevCat.emojis.length - 1, prevLastRow * COLS + col))
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
    { key: 'ArrowLeft', label: 'Move left', handler: () => moveFocusRight(-1) },
    { key: 'ArrowRight', label: 'Move right', handler: () => moveFocusRight(1) },
    { key: 'ArrowUp', label: 'Move up', hint: '↑↓', handler: () => moveFocusUpDown(-1) },
    { key: 'ArrowDown', label: 'Move down', handler: () => moveFocusUpDown(1) },
    {
      key: 'Enter',
      label: 'Copy emoji',
      hint: '↵',
      handler: () => {
        const em = visibleEmojis[selectedIdx]
        if (em) copyEmoji(em.e)
      },
    },
    {
      key: 'f',
      modifiers: ['ctrl'],
      label: 'Toggle favorite',
      handler: () => {
        const em = visibleEmojis[selectedIdx]
        if (em) toggleFavorite(em.e)
      },
    },
  ]
}
