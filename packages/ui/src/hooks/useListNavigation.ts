import type { KeyAction } from './useToolKeyActions'

export interface UseListNavigationOptions<T> {
  onEnter?: (item: T, index: number) => void
  enterLabel?: string
  enterHint?: string
  loop?: boolean
  extraActions?: KeyAction[]
}

export interface UseListNavigationResult<T> {
  selectedIndex: number
  setSelectedIndex: (index: number | ((prev: number) => number)) => void
  selectedItem: T | null
}

export function useListNavigation<T>(
  ...args: [T[], UseListNavigationOptions<T>?]
): UseListNavigationResult<T> {
  const fn = (window.UI as { useListNavigation?: typeof useListNavigation })?.useListNavigation
  if (fn) return fn(...args) as UseListNavigationResult<T>
  return { selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }
}
