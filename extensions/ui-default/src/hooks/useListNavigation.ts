import { useState, useCallback } from 'react'
import { useToolKeyActions, KeyAction } from './useToolKeyActions'

export interface UseListNavigationOptions<T> {
  onEnter?: (item: T, index: number) => void
  enterLabel?: string
  enterHint?: string
  loop?: boolean
  extraActions?: KeyAction[]
}

export interface UseListNavigationResult<T> {
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  selectedItem: T | null
}

export function useListNavigation<T>(
  items: T[],
  options: UseListNavigationOptions<T> = {}
): UseListNavigationResult<T> {
  const {
    onEnter,
    enterLabel = 'Select',
    enterHint = 'Enter',
    loop = false,
    extraActions = [],
  } = options

  const [selectedIndex, setSelectedIndex] = useState(-1)

  const moveUp = useCallback(() => {
    setSelectedIndex((i) => {
      if (i <= 0) return loop ? items.length - 1 : -1
      return i - 1
    })
  }, [items.length, loop])

  const moveDown = useCallback(() => {
    setSelectedIndex((i) => {
      if (i >= items.length - 1) return loop ? 0 : items.length - 1
      return i + 1
    })
  }, [items.length, loop])

  const handleEnter = useCallback(() => {
    setSelectedIndex((i) => {
      if (onEnter && i >= 0 && i < items.length) {
        onEnter(items[i], i)
      }
      return i
    })
  }, [items, onEnter])

  const navActions: KeyAction[] = [
    { key: 'ArrowUp', label: 'Navigate', hint: '↑↓', handler: moveUp },
    { key: 'ArrowDown', label: '', handler: moveDown },
    ...(onEnter
      ? [{ key: 'Enter', label: enterLabel, hint: enterHint, handler: handleEnter }]
      : []),
  ]

  useToolKeyActions([...navActions, ...extraActions])

  const selectedItem =
    selectedIndex >= 0 && selectedIndex < items.length ? items[selectedIndex] : null

  return { selectedIndex, setSelectedIndex, selectedItem }
}
