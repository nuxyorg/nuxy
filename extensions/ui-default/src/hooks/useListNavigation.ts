import { useState, useCallback } from 'react'
import { useToolKeyActions, KeyAction } from './useToolKeyActions'
import { useTranslation } from './useTranslation'

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
  const { t } = useTranslation('com.nuxy.shell')
  const tr = useCallback(
    (key: string, fallback: string) => {
      const val = t(key)
      return val === '' || val === key ? fallback : val
    },
    [t]
  )

  const {
    onEnter,
    enterLabel = tr('keyboard.select', 'Select'),
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
    if (onEnter && selectedIndex >= 0 && selectedIndex < items.length) {
      onEnter(items[selectedIndex], selectedIndex)
    }
  }, [items, onEnter, selectedIndex])

  const navActions: KeyAction[] = [
    {
      key: 'ArrowUp',
      label: tr('keyboard.navigate', 'Navigate'),
      hint: '↑↓',
      handler: moveUp,
      allowRepeat: true,
    },
    { key: 'ArrowDown', label: '', handler: moveDown, allowRepeat: true },
    ...(onEnter
      ? [{ key: 'Enter', label: enterLabel, hint: enterHint, handler: handleEnter }]
      : []),
  ]

  useToolKeyActions([...navActions, ...extraActions])

  const selectedItem =
    selectedIndex >= 0 && selectedIndex < items.length ? items[selectedIndex] : null

  return { selectedIndex, setSelectedIndex, selectedItem }
}
